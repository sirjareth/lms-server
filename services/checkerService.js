const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const Submission = require('../models/Submission');
const CheckResult = require('../models/CheckResult');
const { parseJUnitXml } = require('./testResultParser');

const TEMP_DIR = path.join(__dirname, '../temp/submissions');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Runs a shell command as a Promise with a timeout limit.
 */
function runCommand(command, cwd, timeoutMs = 40000) {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout: stdout || '',
        stderr: stderr || '',
        isTimeout: error && error.killed
      });
    });
  });
}

/**
 * Main function to check a submission asynchronously.
 * @param {string} submissionId - The Mongo ID of the submission.
 */
async function processSubmission(submissionId) {
  const startTime = Date.now();
  console.log(`[Auto-Checker] Starting check for submission: ${submissionId}`);

  // 1. Fetch submission and activity details
  const submission = await Submission.findById(submissionId).populate('activity');
  if (!submission) {
    console.error(`[Auto-Checker] Submission ${submissionId} not found.`);
    return;
  }

  // Update status to checking
  submission.status = 'checking';
  await submission.save();

  const repoDir = path.join(TEMP_DIR, `sub_${submissionId}`);

  try {
    // Clean directory if it already exists
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }

    // 2. Clone GitHub repository
    console.log(`[Auto-Checker] Cloning repository: ${submission.githubUrl}`);
    const git = simpleGit();
    try {
      await git.clone(submission.githubUrl, repoDir, ['--depth', '1']);
    } catch (cloneErr) {
      console.error(`[Auto-Checker] Clone failed: ${cloneErr.message}`);
      await recordFailure(submission, 'clone_failed', `Failed to clone GitHub repository: ${cloneErr.message}`, Date.now() - startTime);
      return;
    }

    // 3. Execute Maven/Java Build & Tests
    console.log(`[Auto-Checker] Running tests in ${repoDir}...`);
    // Runs maven test in batch mode
    const runResult = await runCommand('mvn test -B', repoDir, 45000);

    const durationMs = Date.now() - startTime;

    if (runResult.isTimeout) {
      console.error(`[Auto-Checker] Test execution timed out.`);
      await recordFailure(submission, 'timeout', 'Test execution timed out (exceeded 45 seconds).', durationMs, runResult.stdout + '\n' + runResult.stderr);
      return;
    }

    // 4. Look for Surefire XML Reports
    const surefireReportDir = path.join(repoDir, 'target/surefire-reports');
    let xmlContent = '';

    if (fs.existsSync(surefireReportDir)) {
      const files = fs.readdirSync(surefireReportDir);
      const xmlFile = files.find(f => f.startsWith('TEST-') && f.endsWith('.xml'));
      if (xmlFile) {
        xmlContent = fs.readFileSync(path.join(surefireReportDir, xmlFile), 'utf-8');
      }
    }

    if (!xmlContent) {
      // If no XML found, check if it was a compilation error
      const isCompileError = runResult.error || runResult.stderr.includes('COMPILATION ERROR');
      const errorType = isCompileError ? 'compile' : 'error';
      const logOutput = runResult.stdout || runResult.stderr || 'Build failed before tests could run.';

      await recordFailure(submission, errorType, logOutput, durationMs, logOutput);
      return;
    }

    // 5. Parse XML Test Results
    const parsedResults = await parseJUnitXml(xmlContent);

    // Create CheckResult Document
    const checkResult = await CheckResult.create({
      submission: submission._id,
      testsTotal: parsedResults.testsTotal,
      testsPassed: parsedResults.testsPassed,
      tests: parsedResults.tests,
      errorType: parsedResults.errorType,
      outputLog: runResult.stdout || parsedResults.outputLog,
      durationMs,
      checkedAt: new Date()
    });

    // Determine final submission status
    const isPassed = parsedResults.testsTotal > 0 && parsedResults.testsPassed === parsedResults.testsTotal;
    submission.status = isPassed ? 'passed' : 'failed';
    submission.gradedAt = new Date();
    submission.gradeSource = 'auto';
    submission.gradedBy = null; // Kodigo auto-checker
    await submission.save();

    console.log(`[Auto-Checker] Finished check for ${submissionId}: ${submission.status.toUpperCase()} (${parsedResults.testsPassed}/${parsedResults.testsTotal} passed)`);

  } catch (err) {
    console.error(`[Auto-Checker] Unexpected error processing ${submissionId}:`, err);
    await recordFailure(submission, 'compile', `Internal checker error: ${err.message}`, Date.now() - startTime);
  } finally {
    // Cleanup temporary repo directory
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  }
}

/**
 * Helper to record failure result
 */
async function recordFailure(submission, errorType, logOutput, durationMs, fullLog = '') {
  await CheckResult.create({
    submission: submission._id,
    testsTotal: 0,
    testsPassed: 0,
    tests: [],
    errorType,
    outputLog: fullLog || logOutput,
    durationMs,
    checkedAt: new Date()
  });

  submission.status = 'failed';
  submission.gradedAt = new Date();
  submission.gradeSource = 'auto';
  submission.gradedBy = null;
  await submission.save();
}

module.exports = { processSubmission };
