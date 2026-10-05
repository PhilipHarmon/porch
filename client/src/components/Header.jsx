import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import api from '../api.js';
import Avatar from './Avatar.jsx';
import logo from '../assets/porch-logo.webp';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    async function fetchUnread() {
      try {
        const { data } = await api.get('/notifications/unread-count');
        if (!cancelled) setUnread(data.count || 0);
      } catch {
        // Badge is best-effort; ignore failures.
      }
    }
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="site-title">
          <img src={logo} alt="Porch swing" className="site-logo" />
          Porch
        </Link>
        {user && (
          <nav className="site-nav">
            <Link to="/">Feed</Link>
            <Link to="/friends">Friends</Link>
            <Link to="/notifications" className="nav-with-badge">
              Notifications
              {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            {user.isAdmin && <Link to="/admin">Admin</Link>}
            <a href="https://personal-blog-client.onrender.com" target="_blank" rel="noreferrer noopener">
              Blog
            </a>
          </nav>
        )}
        <div className="header-auth">
          {user ? (
            <>
              <Link to={`/profile/${user.id}`} className="header-profile" title="Your profile">
                <Avatar user={user} size={32} />
              </Link>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
