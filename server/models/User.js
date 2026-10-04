const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: '', trim: true, maxlength: 300 },
    avatarUrl: { type: String, default: '', trim: true },
    coverUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
