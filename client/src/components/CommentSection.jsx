import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { apiError, timeAgo } from '../utils.js';
import Avatar from './Avatar.jsx';

// Comment list + add-comment form for one post.
export default function CommentSection({ postId, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/posts/${postId}/comments`);
      setComments(data);
      if (onCountChange) onCountChange(data.length);
    } catch {
      // Comments are optional content; fail quietly.
    } finally {
      setLoading(false);
    }
  }, [postId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { text: text.trim() });
      setComments((prev) => [...prev, data]);
      setText('');
      if (onCountChange) onCountChange(comments.length + 1);
    } catch (err) {
      setError(apiError(err, 'Could not add your comment.'));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading comments…</p>;
  }

  return (
    <div className="comments">
      {comments.length === 0 && <p className="muted">No comments yet — say something nice.</p>}
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <Avatar user={c.user} size={28} />
          <div className="comment-body">
            <span className="comment-author">{c.user.name}</span>
            <span className="comment-time">{timeAgo(c.createdAt)}</span>
            <p>{c.text}</p>
          </div>
        </div>
      ))}
      {user && (
        <form className="comment-form" onSubmit={submit}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            aria-label="Write a comment"
          />
          <button type="submit" className="btn btn-primary btn-small" disabled={sending || !text.trim()}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      )}
      {error && <p className="alert alert-error">{error}</p>}
    </div>
  );
}
