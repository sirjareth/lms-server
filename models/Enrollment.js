const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "User is required"]
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: [true, "Batch is required"]
  },
  status: {
    type: String,
    enum: ["active", "dropped", "completed"],
    default: "active"
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  }
});

// Unique index on user + batch
enrollmentSchema.index({ user: 1, batch: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
