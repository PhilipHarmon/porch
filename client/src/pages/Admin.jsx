import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { apiError, timeAgo } from '../utils.js';
import Avatar from '../components/Avatar.jsx';

// Admin panel: list users, grant/revoke admin, remove users.
export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(apiError(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) load();
    else setLoading(false);
  }, [user, load]);

  if (!user?.isAdmin) {
    return (
      <div className="narrow">
        <p className="alert alert-error">Not authorized. This page is for admins only.</p>
      </div>
    );
  }

  async function toggleAdmin(u) {
    setBusy(u.id);
    setError('');
    try {
      const { data } = await api.put(`/admin/users/${u.id}/admin`, { isAdmin: !u.isAdmin });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isAdmin: data.isAdmin } : x)));
    } catch (err) {
      setError(apiError(err, 'Could not update admin status.'));
    } finally {
      setBusy(null);
    }
  }

  async function removeUser(u) {
    if (
      !window.confirm(
        `Remove ${u.name} (${u.email})?\n\nThis deletes their posts, comments, likes, friendships, and notifications. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(u.id);
    setError('');
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      setError(apiError(err, 'Could not remove user.'));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="narrow">
        <p className="muted">Loading users…</p>
      </div>
    );
  }

  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Admin</h1>
        <span className="muted">{users.length} {users.length === 1 ? 'user' : 'users'}</span>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {users.map((u) => (
        <div key={u.id} className="admin-user">
          <Avatar user={{ name: u.name, avatarUrl: '' }} size={44} />
          <div className="admin-user-info">
            <span className="admin-user-name">
              {u.name}
              {u.isAdmin && <span className="admin-badge">Admin</span>}
              {u.id === user.id && <span className="muted"> (you)</span>}
            </span>
            <span className="muted admin-user-meta">
              {u.email} · {u.postCount} {u.postCount === 1 ? 'post' : 'posts'} ·{' '}
              {u.friendCount} {u.friendCount === 1 ? 'friend' : 'friends'} · joined{' '}
              {timeAgo(u.createdAt)}
            </span>
          </div>
          <div className="admin-user-actions">
            {u.id !== user.id && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={busy === u.id}
                  onClick={() => toggleAdmin(u)}
                >
                  {u.isAdmin ? 'Remove admin' : 'Make admin'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  disabled={busy === u.id}
                  onClick={() => removeUser(u)}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
