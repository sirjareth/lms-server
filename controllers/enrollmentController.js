const Enrollment = require("../models/Enrollment");
const { errorHandler } = require("../auth");

module.exports.enrollUser = async (req, res) => {
  try {
    const { userId, batchId, status } = req.body;

    const newEnrollment = await Enrollment.create({
      user: userId,
      batch: batchId,
      status: status || "active"
    });

    return res.status(201).send({
      message: "User enrolled successfully",
      enrollment: newEnrollment
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({})
      .populate("user", "-password")
      .populate("batch");
    return res.status(200).send(enrollments);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getUserEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user.id })
      .populate("user", "-password")
      .populate("batch");
    return res.status(200).send(enrollments);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getBatchRoster = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ batch: req.params.batchId })
      .populate("user", "-password")
      .populate("batch");
    return res.status(200).send(enrollments);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) {
      return res.status(404).send({ message: "Enrollment not found" });
    }
    return res.status(200).send({
      message: "Enrollment status updated successfully",
      enrollment: updated
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
