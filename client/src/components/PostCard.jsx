import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { timeAgo } from '../utils.js';
import Avatar from './Avatar.jsx';
import CommentSection from './CommentSection.jsx';

// One post in the feed: author, text, optional image, like button,
// comment toggle. Owners also get a delete button.
export default function PostCard({ post, onDeleted }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwn = user && post.author && post.author.id === user.id;
  const canDelete = isOwn || user?.isAdmin;

  async function toggleLike() {
    try {
      const { data } = await api.post(`/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      // Like failures stay silent (button just doesn't change).
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${post.id}`);
      if (onDeleted) onDeleted(post.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.author.id}`}>
          <Avatar user={post.author} size={44} />
        </Link>
        <div className="post-meta">
          <span>
            <Link to={`/profile/${post.author.id}`} className="post-author">
              {post.author.name}
            </Link>
            {post.wallOwner && post.wallOwner.id !== post.author.id && (
              <span className="post-wall">
                {' → '}
                <Link to={`/profile/${post.wallOwner.id}`}>{post.wallOwner.name}'s wall</Link>
              </span>
            )}
          </span>
          <span className="post-time">{timeAgo(post.createdAt)}</span>
        </div>
        {canDelete && (
          <button
            type="button"
            className="btn btn-ghost btn-small post-delete"
            disabled={deleting}
            onClick={handleDelete}
            title={isOwn ? 'Delete post' : 'Delete post (admin)'}
          >
            Delete
          </button>
        )}
      </div>

      {post.text && <p className="post-text">{post.text}</p>}
      {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="" loading="lazy" />}

      <div className="post-actions">
        <button
          type="button"
          className={`like-btn${liked ? ' liked' : ''}`}
          onClick={toggleLike}
          aria-pressed={liked}
        >
          ♥ {likeCount}
        </button>
        <button
          type="button"
          className="comment-toggle"
          onClick={() => setShowComments((s) => !s)}
        >
          💬 {commentCount} {showComments ? '▲' : ''}
        </button>
      </div>

      {showComments && (
        <CommentSection postId={post.id} onCountChange={setCommentCount} />
      )}
    </article>
  );
}
