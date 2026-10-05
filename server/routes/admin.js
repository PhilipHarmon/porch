const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/admin/users — list every user with basic stats (admin only).
router.get('/users', adminRequired, async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('name email bio isAdmin createdAt');
    const ids = users.map((u) => u._id);
    const [postCounts, friendCounts] = await Promise.all([
      Post.aggregate([
        { $match: { author: { $in: ids } } },
        { $group: { _id: '$author', count: { $sum: 1 } } },
      ]),
      Friendship.aggregate([
        { $match: { status: 'accepted', $or: [{ requester: { $in: ids } }, { recipient: { $in: ids } }] } },
        {
          $group: {
            _id: null,
            pairs: { $push: { requester: '$requester', recipient: '$recipient' } },
          },
        },
      ]),
    ]);

    const postMap = new Map(postCounts.map((r) => [r._id.toString(), r.count]));
    const friendMap = new Map(ids.map((id) => [id.toString(), 0]));
    const pairs = (friendCounts[0] && friendCounts[0].pairs) || [];
    for (const p of pairs) {
      const a = p.requester.toString();
      const b = p.recipient.toString();
      if (friendMap.has(a)) friendMap.set(a, friendMap.get(a) + 1);
      if (friendMap.has(b)) friendMap.set(b, friendMap.get(b) + 1);
    }

    return res.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        isAdmin: !!u.isAdmin,
        postCount: postMap.get(u._id.toString()) || 0,
        friendCount: friendMap.get(u._id.toString()) || 0,
        createdAt: u.createdAt,
      })),
    );
  } catch (err) {
    return next(err);
  }
});

// PUT /api/admin/users/:id/admin — grant or revoke admin ({ isAdmin: true/false }).
// Admins cannot change their own status.
router.put('/users/:id/admin', adminRequired, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own admin status.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.isAdmin = !!req.body.isAdmin;
    await user.save();
    return res.json({ id: user._id.toString(), isAdmin: user.isAdmin });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/admin/users/:id — remove a user and everything they touched:
// their posts (plus likes/comments/notifications on those posts), their own
// likes and comments, friendships, and notifications to/from them.
// Admins cannot remove themselves.
router.delete('/users/:id', adminRequired, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const uid = user._id;

    const theirPosts = await Post.find({ author: uid }).select('_id');
    const theirPostIds = theirPosts.map((p) => p._id);

    await Promise.all([
      // Likes/comments/notifications attached to their posts.
      Like.deleteMany({ post: { $in: theirPostIds } }),
      Comment.deleteMany({ post: { $in: theirPostIds } }),
      Notification.deleteMany({ post: { $in: theirPostIds } }),
      Post.deleteMany({ author: uid }),
      // Their own likes, comments, friendships, notifications.
      Like.deleteMany({ user: uid }),
      Comment.deleteMany({ user: uid }),
      Friendship.deleteMany({ $or: [{ requester: uid }, { recipient: uid }] }),
      Notification.deleteMany({ $or: [{ recipient: uid }, { actor: uid }] }),
      user.deleteOne(),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
