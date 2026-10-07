import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Auth from './pages/Auth.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import Friends from './pages/Friends.jsx';
import Notifications from './pages/Notifications.jsx';
import Admin from './pages/Admin.jsx';
import { moreFromPhilip } from './siteConfig.js';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p className="muted">Porch — pull up a chair and stay a while.</p>
        <div className="footer-more">
          <h4>Also from Philip Harmon</h4>
          <nav className="footer-more-links">
            {moreFromPhilip.map((item) => {
              const base = (item.url || '').replace(/\/+$/, '');
              const href = item.demo ? `${base}?demo=1` : base;
              return (
                <a
                  key={item.name}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={item.blurb}
                >
                  {item.demo ? `${item.name} (demo)` : item.name}
                </a>
              );
            })}
          </nav>
        </div>
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="narrow">
      <h1>Page not found</h1>
      <p className="muted">That porch doesn't exist. Let's head back home.</p>
    </div>
  );
}
