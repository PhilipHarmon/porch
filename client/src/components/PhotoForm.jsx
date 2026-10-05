import React, { useState } from 'react';
import api from '../api.js';
import { apiError } from '../utils.js';

// Add a photo to your own wall without writing a text post.
// Creates a photo post (image + optional caption) that appears in the feed
// and in your profile's Photos section.
export default function PhotoForm({ onAdded }) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!imageUrl.trim() || adding) return;
    setAdding(true);
    setError('');
    try {
      await api.post('/posts', {
        text: caption.trim(),
        imageUrl: imageUrl.trim(),
      });
      setImageUrl('');
      setCaption('');
      if (onAdded) onAdded();
    } catch (err) {
      setError(apiError(err, 'Could not add your photo.'));
    } finally {
      setAdding(false);
    }
  }

  return (
    <form className="photo-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="photo-url">Image URL</label>
        <input
          id="photo-url"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="photo-caption">Caption (optional)</label>
        <input
          id="photo-caption"
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about this photo…"
          maxLength={2000}
        />
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={adding || !imageUrl.trim()}>
        {adding ? 'Adding…' : 'Add photo'}
      </button>
    </form>
  );
}
