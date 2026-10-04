import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { apiError } from '../utils.js';
import Composer from '../components/Composer.jsx';
import PostCard from '../components/PostCard.jsx';

// Home feed: composer on top, then posts from me + friends, newest first.
export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (p, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/feed', { params: { page: p, limit: 10 } });
      setPosts((prev) => (append ? [...prev, ...data.items] : data.items));
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      setError(apiError(err, 'Could not load your feed.'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  function handlePosted() {
    load(1);
  }

  function handleDeleted(id) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="narrow">
      <Composer onPosted={handlePosted} />
      {error && <p className="alert alert-error">{error}</p>}
      {loading && <p className="muted">Loading your feed…</p>}
      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <h2>It's quiet in here</h2>
          <p className="muted">
            Share your first post above, or <Link to="/friends">find friends</Link> to fill up your feed.
          </p>
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
      ))}
      {!loading && page < pages && (
        <button
          type="button"
          className="btn btn-ghost load-more"
          disabled={loadingMore}
          onClick={() => load(page + 1, true)}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
