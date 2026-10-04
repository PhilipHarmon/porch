import React, { useState } from 'react';
import api from '../api.js';
import { apiError } from '../utils.js';

// "What's on your mind?" box at the top of the feed.
export default function Composer({ onPosted }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError('');
    try {
      await api.post('/posts', {
        text: text.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });
      setText('');
      setImageUrl('');
      setShowImage(false);
      if (onPosted) onPosted();
    } catch (err) {
      setError(apiError(err, 'Could not share your post.'));
    } finally {
      setPosting(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
        aria-label="Write a post"
      />
      {showImage && (
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (optional)"
          aria-label="Image URL"
        />
      )}
      {error && <p className="alert alert-error">{error}</p>}
      <div className="composer-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setShowImage((s) => !s)}
        >
          {showImage ? 'Hide image link' : '+ Add image'}
        </button>
        <button type="submit" className="btn btn-primary" disabled={posting || !text.trim()}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
