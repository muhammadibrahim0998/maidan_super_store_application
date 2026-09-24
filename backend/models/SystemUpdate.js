import mongoose from 'mongoose';

const SystemUpdateSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['New Features', 'UI Improvements', 'Security & Logic', 'Performance', 'Bug Fixes']
  },
  iconType: {
    type: String,
    required: true,
    enum: ['zap', 'sparkles', 'shield', 'box', 'activity']
  },
  items: [{
    type: String,
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SystemUpdate = mongoose.model('SystemUpdate', SystemUpdateSchema);
export default SystemUpdate;
