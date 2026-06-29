const Group = require('../models/Group');

const createGroup = async (req, res) => {
  try {
    const { name, memberEmails } = req.body; // memberEmails: array of emails to add, optional
    const User = require('../models/User');

    let memberIds = [req.user.id]; // creator is always a member

    if (memberEmails && memberEmails.length > 0) {
      const users = await User.find({ email: { $in: memberEmails } });
      const foundIds = users.map(u => u._id.toString());
      memberIds = [...new Set([...memberIds, ...foundIds])]; // avoid duplicates
    }

    const group = await Group.create({
      name,
      members: memberIds,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: 'Group created', group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).populate('members', 'name email');
    res.status(200).json({ groups });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    res.status(200).json({ group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
const addMember = async (req, res) => {
  try {
    const { email } = req.body;
    const User = require('../models/User');

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User with this email not found' });

    const alreadyMember = group.members.some(m => m.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'User already in group' });

    group.members.push(userToAdd._id);
    await group.save();

    res.status(200).json({ message: 'Member added', group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createGroup, getMyGroups, getGroupById, addMember };

// module.exports = { createGroup, getMyGroups, getGroupById };