const Submission = require('../models/Submission');
const CheckResult = require('../models/CheckResult');
const Activity = require('../models/Activity');
const Session = require('../models/Session');
const Enrollment = require('../models/Enrollment');
const { errorHandler } = require('../auth');

// TEMPORARY STUB: replace with the real JUnit checker
const runStubChecker = async (submissionId) => {
  setTimeout(async () => {
    try {
      const submission = await Submission.findById(submissionId).populate('activity');
      if (!submission) return;

      const passed = Math.random() > 0.3;
      const testsTotal = 9;
      const testsPassed = passed ? (7 + Math.floor(Math.random() * 3)) : Math.floor(Math.random() * 7);

      await CheckResult.create({
        submission: submissionId,
        testsTotal,
        testsPassed,
        tests: Array.from({ length: testsTotal }).map((_, i) => ({
          name: `Test ${i + 1}`,
          passed: i < testsPassed,
          details: i < testsPassed ? "Passed" : "Failed"
        })),
        outputLog: "Stub log output",
        durationMs: 1500 + Math.random() * 1000
      });

      await Submission.findByIdAndUpdate(submissionId, {
        status: passed ? 'passed' : 'failed',
        gradedAt: new Date(),
        gradedBy: null // null indicates auto-checker
      });
    } catch (err) {
      console.error("Stub checker error:", err);
      await Submission.findByIdAndUpdate(submissionId, { status: 'error' });
    }
  }, 3000);
};

module.exports.createSubmission = async (req, res) => {
  try {
    const { activityId, githubUrl } = req.body;
    const traineeId = req.user.id;

    const activity = await Activity.findById(activityId).populate({
      path: 'session',
      select: 'batch'
    });
    if (!activity) return res.status(404).send({ message: "Activity not found" });

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: traineeId,
      batch: activity.session.batch,
      status: 'active'
    });
    if (!enrollment) return res.status(403).send({ message: "Not actively enrolled in this batch" });

    // Check if latest attempt is still processing
    const lastAttempt = await Submission.findOne({
      activity: activityId,
      trainee: traineeId
    }).sort({ attemptNo: -1 });

    if (lastAttempt && (lastAttempt.status === 'queued' || lastAttempt.status === 'checking')) {
      return res.status(409).send({ message: "Latest attempt is still processing" });
    }

    const nextAttemptNo = lastAttempt ? lastAttempt.attemptNo + 1 : 1;

    const submission = await Submission.create({
      activity: activityId,
      trainee: traineeId,
      githubUrl,
      attemptNo: nextAttemptNo,
      status: 'checking'
    });

    runStubChecker(submission._id);

    return res.status(201).send({ message: "Submission created", submission });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      activity: req.params.activityId,
      trainee: req.user.id
    }).sort({ attemptNo: -1 });
    return res.status(200).send(submissions);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getSubmissionResult = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('activity trainee');
    if (!submission) return res.status(404).send({ message: "Submission not found" });

    if (!req.user.isAdmin && submission.trainee._id.toString() !== req.user.id) {
      return res.status(403).send({ message: "Access forbidden" });
    }

    const checkResult = await CheckResult.findOne({ submission: submission._id });
    return res.status(200).send({ submission, checkResult });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.gradeSubmission = async (req, res) => {
  try {
    const { result } = req.body;
    const status = result === 'passed' ? 'passed' : 'failed';
    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      { status, gradeSource: 'manual', gradedBy: req.user.id, gradedAt: new Date() },
      { new: true }
    );
    return res.status(200).send({ message: "Submission graded", submission: updated });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.recheckSubmission = async (req, res) => {
  try {
    await Submission.findByIdAndUpdate(req.params.id, { status: 'queued', gradeSource: 'auto' });
    runStubChecker(req.params.id);
    return res.status(200).send({ message: "Re-queued for checking" });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
