const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. 'expense_added', 'member_removed'
  details: { type: String, required: true }, // human-readable description
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);