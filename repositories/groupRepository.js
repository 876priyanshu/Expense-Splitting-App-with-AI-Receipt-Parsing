const Group = require('../models/Group');

module.exports = {
  findById: (id) => Group.findById(id),
  findByMember: (userId) => Group.find({ members: userId }),
};