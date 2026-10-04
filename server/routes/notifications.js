const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function serialize(n) {
  return {
    id: n.id,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt,
    actor: n.actor
      ? { id: n.actor.id, name: n.actor.name, avatarUrl: n.actor.avatarUrl || '' }
      : null,
    post: n.post ? n.post.toString() : null,
  };
}

// GET /api/notifications — mine, newest first.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await Notification.find({ recipient: req.user.id })
      .populate('actor', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(rows.map(serialize));
  } catch (err) {
    return next(err);
  }
});

// GET /api/notifications/unread-count — badge count for the header.
router.get('/unread-count', authRequired, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, read: false });
    return res.json({ count });
  } catch (err) {
    return next(err);
  }
});

// POST /api/notifications/read — mark all mine as read.
router.post('/read', authRequired, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// POST /api/notifications/:id/read — mark one as read (own only).
router.post('/:id/read', authRequired, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const n = await Notification.findOne({ _id: req.params.id, recipient: req.user.id });
    if (!n) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    n.read = true;
    await n.save();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
