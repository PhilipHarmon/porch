const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Post', postSchema);
