const Submission = require('../models/Submission');
const CheckResult = require('../models/CheckResult');
const Activity = require('../models/Activity');
const Session = require('../models/Session');
const Enrollment = require('../models/Enrollment');
const { errorHandler } = require('../auth');
const { processSubmission } = require('../services/checkerService');

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
      status: 'queued'
    });

    // Run real auto-checker asynchronously in background
    processSubmission(submission._id).catch(err => {
      console.error("[Auto-Checker Execution Error]:", err);
    });

    return res.status(201).send({ message: "Submission created and queued for checking", submission });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
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
      .populate('activity', '-testSuite')
      .populate('trainee', 'firstName lastName email');

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
    const { status } = req.body;

    if (status !== 'passed' && status !== 'failed') {
      return res.status(400).send({ message: 'status must be "passed" or "failed"' });
    }

    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      { status, gradeSource: 'manual', gradedBy: req.user.id, gradedAt: new Date() },
      { new: true }
    );

    if (!updated) return res.status(404).send({ message: "Submission not found" });

    return res.status(200).send({ message: "Submission graded", submission: updated });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.recheckSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) return res.status(404).send({ message: "Submission not found" });

    if (!req.user.isAdmin && submission.trainee.toString() !== req.user.id) {
      return res.status(403).send({ message: "Access forbidden" });
    }

    submission.status = 'queued';
    submission.gradeSource = 'auto';
    await submission.save();

    // Re-run real auto-checker
    processSubmission(submission._id).catch(err => {
      console.error("[Auto-Checker Execution Error]:", err);
    });

    return res.status(200).send({ message: "Re-queued for checking", submission });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
