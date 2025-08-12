const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'rejected'],
    default: 'waiting'
  },
  callType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  },
  purpose: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  decision: {
    type: String,
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

callSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Call', callSchema);
