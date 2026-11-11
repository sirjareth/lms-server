const Activity = require('../models/Activity');
const Session = require('../models/Session');
const Enrollment = require('../models/Enrollment');
const { errorHandler } = require('../auth');

module.exports.createActivity = async (req, res) => {
  try {
    const { session, title, type, instructions, dueAt, testSuite } = req.body;

    const sessionExists = await Session.findById(session);
    if (!sessionExists) return res.status(404).send({ message: "Session not found" });

    const activity = await Activity.create({ session, title, type, instructions, dueAt, testSuite });
    return res.status(201).send({ message: "Activity created successfully", activity });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getSessionActivity = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).send({ message: "Session not found" });

    if (!req.user.isAdmin) {
      const activeEnrollment = await Enrollment.findOne({
        user: req.user.id,
        batch: session.batch,
        status: 'active'
      });
      if (!activeEnrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    const activity = await Activity.findOne({ session: sessionId });
    if (!activity) return res.status(404).send({ message: "Activity not found" });

    // Hide testSuite for non-admin
    const activityObj = activity.toObject();
    if (!req.user.isAdmin) {
      delete activityObj.testSuite;
    }

    return res.status(200).send(activityObj);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id).populate('session');
    if (!activity) return res.status(404).send({ message: "Activity not found" });

    if (!req.user.isAdmin) {
      const activeEnrollment = await Enrollment.findOne({
        user: req.user.id,
        batch: activity.session.batch,
        status: 'active'
      });
      if (!activeEnrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    const activityObj = activity.toObject();
    if (!req.user.isAdmin) {
      delete activityObj.testSuite;
    }

    return res.status(200).send(activityObj);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.updateActivity = async (req, res) => {
  try {
    const { title, type, instructions, dueAt, testSuite } = req.body;
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { title, type, instructions, dueAt, testSuite },
      { new: true, runValidators: true }
    );
    if (!activity) return res.status(404).send({ message: "Activity not found" });
    return res.status(200).send({ message: "Activity updated successfully", activity });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
