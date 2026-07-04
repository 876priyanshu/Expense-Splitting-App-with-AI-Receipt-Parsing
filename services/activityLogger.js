const ActivityLog = require('../models/ActivityLog');

const logActivity = async (groupId, actorId, action, details) => {
  try {
    await ActivityLog.create({ group: groupId, actor: actorId, action, details });
  } catch (err) {
    // Logging should never break the actual feature it's attached to
    console.error('Failed to log activity:', err.message);
  }
};

module.exports = { logActivity };