const express = require('express');
const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function userSummary(u) {
  return {
    id: u.id,
    name: u.name,
    bio: u.bio || '',
    avatarUrl: u.avatarUrl || '',
  };
}

// POST /api/friends/request { recipientId } — send a friend request.
router.post('/request', authRequired, async (req, res, next) => {
  try {
    const { recipientId } = req.body || {};

    if (!recipientId || !mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ error: 'A valid recipientId is required' });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ error: 'You cannot friend yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: recipientId },
        { requester: recipientId, recipient: req.user.id },
      ],
    });
    if (existing) {
      return res.status(409).json({ error: 'A friendship or request already exists' });
    }

    const fr = await Friendship.create({
      requester: req.user.id,
      recipient: recipientId,
      status: 'pending',
    });

    await Notification.create({
      recipient: recipientId,
      type: 'friend_request',
      actor: req.user.id,
    });

    return res.status(201).json({ id: fr.id, status: fr.status });
  } catch (err) {
    return next(err);
  }
});

// POST /api/friends/accept { requesterId } — accept a pending request.
router.post('/accept', authRequired, async (req, res, next) => {
  try {
    const { requesterId } = req.body || {};
    const fr = await Friendship.findOne({
      requester: requesterId,
      recipient: req.user.id,
      status: 'pending',
    });
    if (!fr) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    fr.status = 'accepted';
    await fr.save();

    await Notification.create({
      recipient: requesterId,
      type: 'friend_accept',
      actor: req.user.id,
    });

    return res.json({ id: fr.id, status: fr.status });
  } catch (err) {
    return next(err);
  }
});

// POST /api/friends/decline { requesterId } — decline a pending request.
router.post('/decline', authRequired, async (req, res, next) => {
  try {
    const { requesterId } = req.body || {};
    await Friendship.deleteOne({
      requester: requesterId,
      recipient: req.user.id,
      status: 'pending',
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/friends/:friendId — unfriend.
router.delete('/:friendId', authRequired, async (req, res, next) => {
  try {
    const { friendId } = req.params;
    if (!mongoose.isValidObjectId(friendId)) {
      return res.status(404).json({ error: 'Not found' });
    }
    await Friendship.deleteOne({
      status: 'accepted',
      $or: [
        { requester: req.user.id, recipient: friendId },
        { requester: friendId, recipient: req.user.id },
      ],
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// GET /api/friends — my accepted friends list.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate('requester recipient', 'name bio avatarUrl')
      .sort({ updatedAt: -1 });

    const friends = rows.map((r) => {
      const other = r.requester.id === req.user.id ? r.recipient : r.requester;
      return userSummary(other);
    });
    return res.json(friends);
  } catch (err) {
    return next(err);
  }
});

// GET /api/friends/requests — pending requests I've received.
router.get('/requests', authRequired, async (req, res, next) => {
  try {
    const rows = await Friendship.find({ status: 'pending', recipient: req.user.id })
      .populate('requester', 'name bio avatarUrl')
      .sort({ createdAt: -1 });

    return res.json(
      rows.map((r) => ({ ...userSummary(r.requester), requestedAt: r.createdAt })),
    );
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
