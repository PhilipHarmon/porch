import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { apiError, timeAgo } from '../utils.js';
import Avatar from '../components/Avatar.jsx';

function notificationText(n) {
  const name = n.actor ? n.actor.name : 'Someone';
  switch (n.type) {
    case 'friend_request':
      return `${name} sent you a friend request`;
    case 'friend_accept':
      return `${name} accepted your friend request`;
    case 'like':
      return `${name} liked your post`;
    case 'comment':
      return `${name} commented on your post`;
    case 'wall_post':
      return `${name} wrote on your wall`;
    default:
      return `${name} did something`;
  }
}

function notificationLink(n) {
  switch (n.type) {
    case 'friend_request':
      return '/friends';
    case 'friend_accept':
      return n.actor ? `/profile/${n.actor.id}` : '/friends';
    case 'wall_post':
      return '/profile/me';
    default:
      return '/';
  }
}

// Notification inbox.
export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      setItems(data);
    } catch (err) {
      setError(apiError(err, 'Could not load notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    try {
      await api.post('/notifications/read');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // best effort
    }
  }

  async function markOneRead(n) {
    if (n.read) return;
    try {
      await api.post(`/notifications/${n.id}/read`);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      // best effort
    }
  }

  if (loading) {
    return (
      <div className="narrow">
        <p className="muted">Loading notifications…</p>
      </div>
    );
  }

  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Notifications</h1>
        {items.some((n) => !n.read) && (
          <button type="button" className="btn btn-ghost btn-small" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {items.length === 0 && <p className="muted">Nothing yet — likes, comments, wall posts, and friend requests will show up here.</p>}
      {items.map((n) => (
        <Link
          key={n.id}
          to={notificationLink(n)}
          className={`notif-item${n.read ? '' : ' notif-unread'}`}
          onClick={() => markOneRead(n)}
        >
          <Avatar user={n.actor} size={44} />
          <span className="notif-body">
            <span className="notif-text">{notificationText(n)}</span>
            <span className="notif-time">{timeAgo(n.createdAt)}</span>
          </span>
          {!n.read && <span className="notif-dot" aria-label="Unread" />}
        </Link>
      ))}
    </div>
  );
}
