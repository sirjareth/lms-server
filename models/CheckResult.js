const mongoose = require('mongoose');

const checkResultSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
    unique: true
  },
  testsTotal: Number,
  testsPassed: Number,
  tests: [{
    name: String,
    passed: Boolean,
    details: String
  }],
  errorType: {
    type: String,
    enum: ['compile', 'timeout', 'clone_failed']
  },
  outputLog: String,
  durationMs: Number,
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CheckResult', checkResultSchema);
