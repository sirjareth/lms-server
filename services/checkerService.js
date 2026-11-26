const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const Submission = require('../models/Submission');
const CheckResult = require('../models/CheckResult');
const { parseJUnitXml } = require('./testResultParser');

const TEMP_DIR = path.join(__dirname, '../temp/submissions');
const RESOURCES_DIR = path.join(__dirname, '../resources/b526');
const configuredTimeoutMs = Number.parseInt(process.env.CHECKER_TIMEOUT_MS, 10);
const CHECKER_TIMEOUT_MS = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 300000;

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Runs a shell command as a Promise with a timeout limit.
 */
function runCommand(command, cwd, timeoutMs = CHECKER_TIMEOUT_MS) {
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
  const testSuitePath = typeof activity?.testSuite === 'string' ? activity.testSuite.replace(/\\/g, '/') : '';
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

    // 3. MERGE TRAINER TESTS: Inject only the specific activity folder
    if (testSuitePath) {
      console.log(`[Auto-Checker] Activity TestSuite Path: ${activity.testSuite} (normalized: ${testSuitePath})`);

      // Kunin ang absolute source directory ng test file
      const sourceTestFile = path.resolve(RESOURCES_DIR, testSuitePath);
      const sourceDir = path.dirname(sourceTestFile);

      // I-map ang destination path base sa relative path ng source
      const relativePath = path.relative(RESOURCES_DIR, sourceDir);
      const destDir = path.resolve(repoDir, relativePath);

      if (fs.existsSync(sourceDir)) {
        console.log(`[Auto-Checker] Injecting test folder: ${relativePath}`);
        fs.mkdirSync(destDir, { recursive: true });
        copyFolderRecursiveSync(sourceDir, destDir);
      } else {
        console.warn(`[Auto-Checker] WARNING: Test directory NOT FOUND at ${sourceDir}`);
      }

      // Inject Standard POM
      const sourcePomPath = path.resolve(RESOURCES_DIR, 'pom.xml');
      const destPomPath = path.resolve(repoDir, 'pom.xml');
      if (fs.existsSync(sourcePomPath)) {
        fs.copyFileSync(sourcePomPath, destPomPath);
      }
    } else {
      console.warn(`[Auto-Checker] WARNING: No testSuite defined for activity ${activity._id}`);
    }

    // 4. Execute Maven/Java Build & Tests
    console.log(`[Auto-Checker] Running tests in ${repoDir}...`);

    // Kunin ang filename ng test suite (halimbawa: HelloWorld_ActivityTest)
    const testClassName = path.posix.basename(testSuitePath, '.java');

    // I-run lang ang specific test class na ito
    const mavenCommand = `mvn test -B -Dtest=${testClassName}`;
    const runResult = await runCommand(mavenCommand, repoDir);

    const durationMs = Date.now() - startTime;

    if (runResult.isTimeout) {
      console.error(`[Auto-Checker] Test execution timed out.`);
      await recordFailure(submission, 'timeout', 'Test execution timed out (exceeded ' + Math.ceil(CHECKER_TIMEOUT_MS / 1000) + ' seconds).', durationMs, runResult.stdout + '\n' + runResult.stderr);
      return;
    }

    // 5. Look for Surefire XML Reports matching the specific activity test class
    const surefireReportDir = path.join(repoDir, 'target/surefire-reports');
    let xmlContent = '';

    if (fs.existsSync(surefireReportDir)) {
      const files = fs.readdirSync(surefireReportDir);

      // Determine expected test class name from testSuite path
      // e.g. "src/test/java/com/joysistvi/s05/activity/DataType_ActivityTest.java" -> "DataType_ActivityTest"
      let expectedClassName = '';
      if (testSuitePath) {
        const basename = path.posix.basename(testSuitePath, '.java');
        if (basename && !testSuitePath.endsWith('/')) {
          expectedClassName = basename;
        }
      }

      let xmlFile;
      if (expectedClassName) {
        xmlFile = files.find(f => f.includes(expectedClassName) && f.endsWith('.xml'));
      }

      // Fallback to the first TEST-*.xml if specific file not found
      if (!xmlFile) {
        xmlFile = files.find(f => f.startsWith('TEST-') && f.endsWith('.xml'));
      }

      if (xmlFile) {
        console.log(`[Auto-Checker] Parsing surefire report: ${xmlFile}`);
        xmlContent = fs.readFileSync(path.join(surefireReportDir, xmlFile), 'utf-8');
      }
    }

    if (!xmlContent) {
      // If no XML found, check if it was a compilation error
      const isCompileError = runResult.error || runResult.stderr.includes('COMPILATION ERROR') || runResult.stdout.includes('BUILD FAILURE');
      const errorType = isCompileError ? 'compile' : 'error';

      // Clean up the log output to be more readable for students/trainers
      let logOutput = runResult.stdout || runResult.stderr || 'Build failed before tests could run.';
      if (isCompileError) {
          // Extract just the compilation error section
          const compMatch = logOutput.match(/\[ERROR\] \/.*\.java:\[\d+,\d+\].*/g);
          if (compMatch) {
              logOutput = 'Compilation Errors:\n' + compMatch.join('\n');
          } else {
              logOutput = 'Build failed. Please check your code syntax and ensure all required classes are present.';
          }
      }

      await recordFailure(submission, errorType, logOutput, durationMs, runResult.stdout + '\n' + runResult.stderr);
      return;
    }

    // 6. Parse XML Test Results
    const parsedResults = await parseJUnitXml(xmlContent);

    // Create or update CheckResult Document
    const checkResult = await CheckResult.findOneAndUpdate(
      { submission: submission._id },
      {
        testsTotal: parsedResults.testsTotal,
        testsPassed: parsedResults.testsPassed,
        tests: parsedResults.tests,
        errorType: parsedResults.errorType,
        outputLog: runResult.stdout || parsedResults.outputLog,
        durationMs,
        checkedAt: new Date()
      },
      { upsert: true, new: true }
    );

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
