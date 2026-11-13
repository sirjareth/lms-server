const Session = require('../models/Session');
const Activity = require('../models/Activity');
const Submission = require('../models/Submission');
const CheckResult = require('../models/CheckResult');
const Enrollment = require('../models/Enrollment');
const { errorHandler } = require('../auth');

module.exports.getTraineeDashboard = async (req, res) => {
  try {
    const { batchId } = req.params;
    const traineeId = req.user.id;

    if (!req.user.isAdmin) {
      const enrollment = await Enrollment.findOne({
        user: traineeId,
        batch: batchId,
        status: 'active'
      });
      if (!enrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    const sessions = await Session.find({ batch: batchId }).sort({ order: 1 });

    let passedCount = 0;
    let totalActivities = 0;

    const dashboardSessions = await Promise.all(sessions.map(async (session) => {
      const activity = await Activity.findOne({ session: session._id });

      let submissionData = { status: 'notSubmitted' };

      if (activity) {
        totalActivities++;
        const latestSubmission = await Submission.findOne({
          activity: activity._id,
          trainee: traineeId
        })
        .sort({ attemptNo: -1 })
        .populate('gradedBy', 'firstName lastName');

        if (latestSubmission) {
          let testsPassed = null;
          let testsTotal = null;

          if (latestSubmission.status === 'passed' || latestSubmission.status === 'failed') {
            const checkResult = await CheckResult.findOne({ submission: latestSubmission._id });
            if (checkResult) {
              testsPassed = checkResult.testsPassed;
              testsTotal = checkResult.testsTotal;
            }
          }

          if (latestSubmission.status === 'passed') {
            passedCount++;
          }

          submissionData = {
            id: latestSubmission._id,
            status: latestSubmission.status,
            githubUrl: latestSubmission.githubUrl,
            gradeSource: latestSubmission.gradeSource,
            gradedByName: latestSubmission.gradedBy
              ? `${latestSubmission.gradedBy.firstName} ${latestSubmission.gradedBy.lastName}`
              : (latestSubmission.gradeSource === 'auto' ? 'Kodigo auto-checker' : null),
            gradedAt: latestSubmission.gradedAt,
            submittedAt: latestSubmission.submittedAt,
            testsPassed,
            testsTotal
          };
        }
      }

      return {
        session,
        activity: activity ? { id: activity._id, title: activity.title, type: activity.type, dueAt: activity.dueAt } : null,
        submission: submissionData
      };
    }));

    return res.status(200).send({
      batchId,
      totals: {
        passed: passedCount,
        total: totalActivities
      },
      sessions: dashboardSessions
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getTrainerDashboard = async (req, res) => {
  try {
    const { batchId } = req.params;

    const sessions = await Session.find({ batch: batchId }).sort({ order: 1 });

    const sessionStats = await Promise.all(sessions.map(async (session) => {
      const activity = await Activity.findOne({ session: session._id });
      if (!activity) {
        return {
          session,
          activity: null,
          stats: { submitted: 0, passed: 0, failed: 0, checking: 0, passRate: "0%" }
        };
      }

      // Get all latest attempts per trainee for this activity
      const submissions = await Submission.aggregate([
        { $match: { activity: activity._id } },
        { $sort: { trainee: 1, attemptNo: -1 } },
        {
          $group: {
            _id: "$trainee",
            latestStatus: { $first: "$status" }
          }
        }
      ]);

      let submitted = submissions.length;
      let passed = submissions.filter(s => s.latestStatus === 'passed').length;
      let failed = submissions.filter(s => s.latestStatus === 'failed').length;
      let checking = submissions.filter(s => s.latestStatus === 'queued' || s.latestStatus === 'checking').length;

      let passRate = submitted > 0 ? `${Math.round((passed / submitted) * 100)}%` : "0%";

      return {
        session,
        activity: { id: activity._id, title: activity.title, type: activity.type },
        stats: { submitted, passed, failed, checking, passRate }
      };
    }));

    // 10 most recent submissions with trainee name for this batch's activities
    const activityIds = (await Activity.find({ session: { $in: sessions.map(s => s._id) } })).map(a => a._id);

    const recentSubmissions = await Submission.find({ activity: { $in: activityIds } })
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate('trainee', 'name email')
      .populate('activity', 'title');

    return res.status(200).send({
      batchId,
      sessionStats,
      recentSubmissions
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
