const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  trainee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  githubUrl: {
    type: String,
    required: true
  },
  commitSha: String,
  attemptNo: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'checking', 'passed', 'failed', 'error'],
    default: 'queued'
  },
  gradeSource: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: Date,
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', submissionSchema);
