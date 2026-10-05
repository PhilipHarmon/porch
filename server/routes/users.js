const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { authRequired, optionalAuth } = require('../middleware/auth');
const { getFriendshipStatus } = require('../utils/friends');

const router = express.Router();

// GET /api/users/search?q= — search users by name (auth required).
// Each result carries the viewer's friendship status with that user.
router.get('/search', authRequired, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json([]);
    }
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      _id: { $ne: req.user.id },
      name: { $regex: safe, $options: 'i' },
    })
      .limit(20)
      .sort({ name: 1 });

    const results = [];
    for (const u of users) {
      results.push({
        id: u.id,
        name: u.name,
        bio: u.bio || '',
        avatarUrl: u.avatarUrl || '',
        friendship: await getFriendshipStatus(req.user.id, u._id),
      });
    }
    return res.json(results);
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:id — public profile with friend count and the viewer's
// friendship status relative to this user (when logged in).
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendCount = await Friendship.countDocuments({
      status: 'accepted',
      $or: [{ requester: user._id }, { recipient: user._id }],
    });

    let friendship = 'none';
    if (req.user) {
      friendship = await getFriendshipStatus(req.user.id, user._id);
    }

    return res.json({
      id: user.id,
      name: user.name,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      coverUrl: user.coverUrl || '',
      createdAt: user.createdAt,
      friendCount,
      friendship,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/users/me — update own profile (auth required).
router.put('/me', authRequired, async (req, res, next) => {
  try {
    const { name, bio, avatarUrl, coverUrl } = req.body || {};
    const updates = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.name = String(name).trim().slice(0, 60);
    }
    if (bio !== undefined) updates.bio = String(bio).slice(0, 300);
    if (avatarUrl !== undefined) updates.avatarUrl = String(avatarUrl).trim();
    if (coverUrl !== undefined) updates.coverUrl = String(coverUrl).trim();

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      coverUrl: user.coverUrl || '',
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
