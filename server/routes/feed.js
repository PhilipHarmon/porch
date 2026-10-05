const express = require('express');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const { authRequired } = require('../middleware/auth');
const { getFriendIds } = require('../utils/friends');

const router = express.Router();

// GET /api/feed — posts by me + my accepted friends, newest first, paginated.
// Includes wall posts written on our walls. Each item carries
// author {id,name,avatarUrl}, wallOwner (or null), likeCount, commentCount, likedByMe.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const friendIds = await getFriendIds(req.user.id);
    const authors = [req.user.id, ...friendIds];
    const filter = { $or: [{ author: { $in: authors } }, { wallOwner: { $in: authors } }] };

    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name avatarUrl')
      .populate('wallOwner', 'name avatarUrl');

    const postIds = posts.map((p) => p._id);

    const [likeAgg, commentAgg, myLikes] = await Promise.all([
      Like.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: '$post', count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: '$post', count: { $sum: 1 } } },
      ]),
      Like.find({ post: { $in: postIds }, user: req.user.id }).select('post'),
    ]);

    const likeMap = new Map(likeAgg.map((r) => [r._id.toString(), r.count]));
    const commentMap = new Map(commentAgg.map((r) => [r._id.toString(), r.count]));
    const likedSet = new Set(myLikes.map((l) => l.post.toString()));

    const items = posts.map((p) => ({
      id: p.id,
      text: p.text,
      imageUrl: p.imageUrl || '',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      author: {
        id: p.author.id,
        name: p.author.name,
        avatarUrl: p.author.avatarUrl || '',
      },
      wallOwner: p.wallOwner
        ? {
            id: p.wallOwner.id,
            name: p.wallOwner.name,
            avatarUrl: p.wallOwner.avatarUrl || '',
          }
        : null,
      likeCount: likeMap.get(p._id.toString()) || 0,
      commentCount: commentMap.get(p._id.toString()) || 0,
      likedByMe: likedSet.has(p._id.toString()),
    }));

    return res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
