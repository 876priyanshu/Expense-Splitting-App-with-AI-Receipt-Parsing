const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { createGroup, getMyGroups, getGroupById, addMember, removeMember } = require('../controllers/groupController');

router.delete('/:id/members', protect, removeMember);

router.post('/', protect, createGroup);
router.get('/', protect, getMyGroups);
router.get('/:id', protect, getGroupById);
router.post('/:id/members', protect, addMember);
module.exports = router;