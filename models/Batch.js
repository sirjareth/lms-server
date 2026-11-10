const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Batch name is required"]
  },
  programTitle: {
    type: String,
    enum: ["Java"],
    default: "Java"
  },
  mode: {
    type: String,
    required: [true, "Mode is required"]
  },
  startDate: {
    type: Date,
    required: [true, "Start date is required"]
  },
  endDate: {
    type: Date,
    required: [true, "End date is required"]
  },
  trainers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  meetLink: {
    type: String
  },
  isArchived: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Batch", batchSchema);
