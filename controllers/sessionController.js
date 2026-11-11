const Session = require('../models/Session');
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

    if (!req.user.isAdmin) {
      const activeEnrollment = await Enrollment.findOne({
        user: req.user.id,
        batch: batchId,
        status: 'active'
      });
      if (!activeEnrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    const sessions = await Session.find({ batch: batchId }).sort({ order: 1 });
    return res.status(200).send(sessions);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('batch');
    if (!session) return res.status(404).send({ message: "Session not found" });

    if (!req.user.isAdmin) {
      const activeEnrollment = await Enrollment.findOne({
        user: req.user.id,
        batch: session.batch._id,
        status: 'active'
      });
      if (!activeEnrollment) {
        return res.status(403).send({ message: "Access forbidden: Not actively enrolled in this batch" });
      }
    }

    return res.status(200).send(session);
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
