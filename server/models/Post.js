const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // When set, this post was written on another user's wall (their profile).
    // Null means a normal post on the author's own timeline.
    wallOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Text is optional when an image is attached (photo-only posts allowed).
    text: { type: String, default: '', trim: true, maxlength: 2000 },
    imageUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Post', postSchema);
