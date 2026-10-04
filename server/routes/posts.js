const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { authRequired, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function authorSummary(a) {
  return { id: a.id, name: a.name, avatarUrl: a.avatarUrl || '' };
}

// Serializes one post with counts and the viewer's like state.
async function serializePost(post, viewerId) {
  const [likeCount, commentCount, liked] = await Promise.all([
    Like.countDocuments({ post: post._id }),
    Comment.countDocuments({ post: post._id }),
    viewerId ? Like.exists({ post: post._id, user: viewerId }) : null,
  ]);
  return {
    id: post.id,
    text: post.text,
    imageUrl: post.imageUrl || '',
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: authorSummary(post.author),
    likeCount,
    commentCount,
    likedByMe: !!liked,
  };
}

// GET /api/posts?author=<id>&page=&limit= — posts by one author, newest first.
// (Used by profile pages.)
router.get('/', async (req, res, next) => {
  try {
    const { author } = req.query;
    if (!author || !isValidId(author)) {
      return res.status(400).json({ error: 'A valid author id is required' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = { author };
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name avatarUrl');

    const items = [];
    for (const p of posts) {
      items.push(await serializePost(p, null));
    }
    return res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    return next(err);
  }
});

// POST /api/posts — create a post (auth).
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { text, imageUrl } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Post text is required' });
    }

    const post = await Post.create({
      author: req.user.id,
      text: text.trim(),
      imageUrl: (imageUrl || '').trim(),
    });
    await post.populate('author', 'name avatarUrl');
    return res.status(201).json(await serializePost(post, req.user.id));
  } catch (err) {
    return next(err);
  }
});

// GET /api/posts/:id — one post with counts.
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const post = await Post.findById(req.params.id).populate('author', 'name avatarUrl');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(await serializePost(post, req.user ? req.user.id : null));
  } catch (err) {
    return next(err);
  }
});

// PUT /api/posts/:id — edit own post (auth).
router.put('/:id', authRequired, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const { text, imageUrl } = req.body || {};
    if (text !== undefined) {
      if (!text.trim()) {
        return res.status(400).json({ error: 'Post text cannot be empty' });
      }
      post.text = text.trim();
    }
    if (imageUrl !== undefined) {
      post.imageUrl = String(imageUrl).trim();
    }
    await post.save();
    await post.populate('author', 'name avatarUrl');
    return res.json(await serializePost(post, req.user.id));
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/posts/:id — delete own post and its likes/comments/notifications (auth).
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await Promise.all([
      Like.deleteMany({ post: post._id }),
      Comment.deleteMany({ post: post._id }),
      Notification.deleteMany({ post: post._id }),
      post.deleteOne(),
    ]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// POST /api/posts/:id/like — toggle like (auth).
// Creates a notification for the post author (unless they liked their own post).
router.post('/:id/like', authRequired, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existing = await Like.findOne({ post: post._id, user: req.user.id });
    let liked;
    if (existing) {
      await existing.deleteOne();
      liked = false;
    } else {
      await Like.create({ post: post._id, user: req.user.id });
      liked = true;
      if (post.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.author,
          type: 'like',
          actor: req.user.id,
          post: post._id,
        });
      }
    }

    const likeCount = await Like.countDocuments({ post: post._id });
    return res.json({ liked, likeCount });
  } catch (err) {
    return next(err);
  }
});

// GET /api/posts/:id/comments — comments oldest first.
router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = await Comment.find({ post: post._id })
      .populate('user', 'name avatarUrl')
      .sort({ createdAt: 1 });

    return res.json(
      comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        user: c.user
          ? { id: c.user.id, name: c.user.name, avatarUrl: c.user.avatarUrl || '' }
          : { id: null, name: 'Unknown', avatarUrl: '' },
      })),
    );
  } catch (err) {
    return next(err);
  }
});

// POST /api/posts/:id/comments — add a comment (auth).
// Creates a notification for the post author (unless they commented on their own post).
router.post('/:id/comments', authRequired, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await Comment.create({
      post: post._id,
      user: req.user.id,
      text: text.trim(),
    });
    await comment.populate('user', 'name avatarUrl');

    if (post.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.author,
        type: 'comment',
        actor: req.user.id,
        post: post._id,
      });
    }

    return res.status(201).json({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        avatarUrl: comment.user.avatarUrl || '',
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
