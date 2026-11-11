const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['activity', 'capstone', 'exam'],
    default: 'activity'
  },
  instructions: {
    type: String
  },
  dueAt: {
    type: Date
  },
  testSuite: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
