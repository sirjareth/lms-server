const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: true
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

sessionSchema.index({ batch: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Session', sessionSchema);
