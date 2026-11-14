const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const Submission = require('../models/Submission');
const CheckResult = require('../models/CheckResult');
const { parseJUnitXml } = require('./testResultParser');

const TEMP_DIR = path.join(__dirname, '../temp/submissions');
const RESOURCES_DIR = path.join(__dirname, '../resources/b526');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Runs a shell command as a Promise with a timeout limit.
 */
function runCommand(command, cwd, timeoutMs = 60000) {
  return new Promise((resolve) => {
    // Windows requires 'cmd /c' to run .cmd/.bat files like mvn
    const finalCommand = process.platform === 'win32' ? `cmd /c ${command}` : command;
    console.log(`[Auto-Checker] Executing: ${finalCommand} in ${cwd}`);

    exec(finalCommand, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
      // Log bits of output for debugging
      if (stdout) console.log(`[Auto-Checker] STDOUT: ${stdout.substring(0, 500)}`);
      if (stderr) console.log(`[Auto-Checker] STDERR: ${stderr.substring(0, 500)}`);
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

  const activity = submission.activity;
  if (!activity) {
    console.error(`[Auto-Checker] Activity not linked to submission ${submissionId}.`);
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
    const git = typeof simpleGit === 'function' ? simpleGit() : (simpleGit.simpleGit ? simpleGit.simpleGit() : simpleGit.default());
    try {
      await git.clone(submission.githubUrl, repoDir, ['--depth', '1']);
    } catch (cloneErr) {
      console.error(`[Auto-Checker] Clone failed: ${cloneErr.message}`);
      await recordFailure(submission, 'clone_failed', `Failed to clone GitHub repository: ${cloneErr.message}`, Date.now() - startTime);
      return;
    }

    // 3. MERGE TRAINER TESTS: Inject test suite and POM from resources
    if (activity.testSuite) {
      const sourceTestPath = path.resolve(RESOURCES_DIR, activity.testSuite);
      const destTestPath = path.resolve(repoDir, activity.testSuite);
      const sourcePomPath = path.resolve(RESOURCES_DIR, 'pom.xml');
      const destPomPath = path.resolve(repoDir, 'pom.xml');

      console.log(`[Auto-Checker] Activity TestSuite Path: ${activity.testSuite}`);

      // Inject Test Suite
      if (fs.existsSync(sourceTestPath)) {
        fs.mkdirSync(path.dirname(destTestPath), { recursive: true });
        if (fs.lstatSync(sourceTestPath).isDirectory()) {
            copyFolderRecursiveSync(sourceTestPath, destTestPath);
        } else {
            fs.copyFileSync(sourceTestPath, destTestPath);
        }
      } else {
        console.warn(`[Auto-Checker] WARNING: Test suite NOT FOUND at ${sourceTestPath}`);
      }

      // Inject Standard POM
      if (fs.existsSync(sourcePomPath)) {
        console.log(`[Auto-Checker] Injecting standard POM...`);
        fs.copyFileSync(sourcePomPath, destPomPath);
      }
    } else {
      console.warn(`[Auto-Checker] WARNING: No testSuite defined for activity ${activity._id}`);
    }

    // 4. Execute Maven/Java Build & Tests
    console.log(`[Auto-Checker] Running tests in ${repoDir}...`);
    // Runs maven test in batch mode
    const runResult = await runCommand('mvn test -B', repoDir, 60000);

    const durationMs = Date.now() - startTime;

    if (runResult.isTimeout) {
      console.error(`[Auto-Checker] Test execution timed out.`);
      await recordFailure(submission, 'timeout', 'Test execution timed out (exceeded 60 seconds).', durationMs, runResult.stdout + '\n' + runResult.stderr);
      return;
    }

    // 5. Look for Surefire XML Reports
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
      const isCompileError = runResult.error || runResult.stderr.includes('COMPILATION ERROR') || runResult.stdout.includes('BUILD FAILURE');
      const errorType = isCompileError ? 'compile' : 'error';
      const logOutput = runResult.stdout || runResult.stderr || 'Build failed before tests could run.';

      await recordFailure(submission, errorType, logOutput, durationMs, logOutput);
      return;
    }

    // 6. Parse XML Test Results
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

    // Determine final submission status (80% Passing Threshold)
    const PASSING_THRESHOLD = 0.80; // 80%
    const passRate = parsedResults.testsTotal > 0 ? (parsedResults.testsPassed / parsedResults.testsTotal) : 0;
    const isPassed = passRate >= PASSING_THRESHOLD;

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
  await CheckResult.findOneAndUpdate(
    { submission: submission._id },
    {
      testsTotal: 0,
      testsPassed: 0,
      tests: [],
      errorType,
      outputLog: fullLog || logOutput,
      durationMs,
      checkedAt: new Date()
    },
    { upsert: true }
  );

  submission.status = 'failed';
  submission.gradedAt = new Date();
  submission.gradeSource = 'auto';
  submission.gradedBy = null;
  await submission.save();
}

/**
 * Simple recursive copy helper
 */
function copyFolderRecursiveSync(source, target) {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    const files = fs.readdirSync(source);
    files.forEach(file => {
        const curSource = path.join(source, file);
        const curTarget = path.join(target, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            copyFolderRecursiveSync(curSource, curTarget);
        } else {
            fs.copyFileSync(curSource, curTarget);
        }
    });
}

module.exports = { processSubmission };
