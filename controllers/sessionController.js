const Session = require('../models/Session');
const Activity = require('../models/Activity');
const Enrollment = require('../models/Enrollment');
const { errorHandler } = require('../auth');

module.exports.createSession = async (req, res) => {
  try {
    const { batch, code, title, order, discussedAt } = req.body;
    const session = await Session.create({ batch, code, title, order, discussedAt });
    return res.status(201).send({ message: "Session created successfully", session });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getBatchSessions = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Determine user role or check active enrollment
    const isTrainerOrAdmin = req.user.isAdmin || req.user.role === 'trainer' || req.user.role === 'admin';

    if (!isTrainerOrAdmin) {
      const activeEnrollment = await Enrollment.findOne({
        user: req.user.id,
        batch: batchId,
        status: 'active'
      });
      if (!activeEnrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    // Get sessions
    const sessions = await Session.find({ batch: batchId }).sort({ order: 1 });

    // Populate activity for each session
    const sessionsWithActivities = await Promise.all(
      sessions.map(async (sess) => {
        const activity = await Activity.findOne({ session: sess._id }).lean();
        const sessObj = sess.toObject();
        sessObj.activity = activity || null;
        return sessObj;
      })
    );

    return res.status(200).send(sessionsWithActivities);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('batch');
    if (!session) return res.status(404).send({ message: "Session not found" });

    const isTrainerOrAdmin = req.user.isAdmin || req.user.role === 'trainer' || req.user.role === 'admin';

    if (!isTrainerOrAdmin) {
      const activeEnrollment = await Enrollment.findOne({
        user: req.user.id,
        batch: session.batch._id,
        status: 'active'
      });
      if (!activeEnrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    const sessObj = session.toObject();
    const activity = await Activity.findOne({ session: session._id }).lean();
    sessObj.activity = activity || null;

    return res.status(200).send(sessObj);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.updateSession = async (req, res) => {
  try {
    const { code, title, order, discussedAt } = req.body;
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { code, title, order, discussedAt },
      { new: true, runValidators: true }
    );
    if (!session) return res.status(404).send({ message: "Session not found" });
    return res.status(200).send({ message: "Session updated successfully", session });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
