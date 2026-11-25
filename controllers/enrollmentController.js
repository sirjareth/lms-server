const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Batch = require("../models/Batch");
const mongoose = require("mongoose");
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

module.exports.enrollByEmail = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { batchId } = req.body;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send({ message: "Enter a valid email address." });
    if (!mongoose.isValidObjectId(batchId)) return res.status(400).send({ message: "Select a valid batch." });
    const batch = await Batch.findById(batchId);
    if (!batch || batch.isArchived) return res.status(404).send({ message: "Active batch not found." });
    let user = await User.findOne({ email });
    if (user?.isAdmin) return res.status(400).send({ message: "An admin account cannot be enrolled as a trainee." });
    if (user && !user.isActive) return res.status(400).send({ message: "This account is deactivated. Reactivate it before enrolling." });
    const existingEnrollment = user ? await Enrollment.findOne({ user: user._id, batch: batch._id }) : null;
    if (existingEnrollment?.status === "active") return res.status(200).send({ message: "This email is already enrolled in the selected batch." });
    if (user) {
      const otherEnrollments = await Enrollment.find({ user: user._id, status: "active", batch: { $ne: batch._id } }).populate("batch");
      const conflict = otherEnrollments.find((enrollment) => enrollment.batch && !enrollment.batch.isArchived);
      if (conflict) return res.status(409).send({ message: "This trainee is already active in another batch." });
    }
    if (!user) {
      const name = email.split("@")[0].replace(/[._-]+/g, " ").trim();
      const parts = name.split(/\s+/).filter(Boolean);
      user = await User.create({ firstName: parts[0] || "New", lastName: parts.slice(1).join(" ") || "Trainee", email, isAdmin: false });
    }
    let enrollment;
    if (existingEnrollment) {
      existingEnrollment.status = "active";
      enrollment = await existingEnrollment.save();
    } else {
      enrollment = await Enrollment.create({ user: user._id, batch: batch._id, status: "active" });
    }
    return res.status(existingEnrollment ? 200 : 201).send({
      message: "Trainee enrolled successfully. They can sign in with Google using this email.",
      enrollment
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
