const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },

  sessionNumber: {
    type: Number
  },

  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    default: 'PRJ'
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  order: {
    type: Number,
    required: true,
    min: 1
  },

  discussedAt: {
    type: Date
  }
}, { timestamps: true });



sessionSchema.index(
  { batch: 1, sessionNumber: 1 },
  { unique: true }
);

sessionSchema.index(
  { batch: 1, code: 1 },
  { unique: true }
);

module.exports = mongoose.model('Session', sessionSchema);

sessionSchema.pre('save', async function(next) {

  if (!this.isNew) {
    return next();
  }

  const lastSession = await this.constructor
    .findOne({ batch: this.batch })
    .sort({ sessionNumber: -1 });

  this.sessionNumber = lastSession
    ? lastSession.sessionNumber + 1
    : 1;

  next();
});