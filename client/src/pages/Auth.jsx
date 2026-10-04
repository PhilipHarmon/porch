import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { apiError } from '../utils.js';

// Combined login / register page.
export default function Auth() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || '/';

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiError(err, 'Could not sign you in.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow auth-page">
      <h1>{mode === 'login' ? 'Welcome back' : 'Pull up a chair'}</h1>
      <p className="muted">
        {mode === 'login'
          ? 'Log in to see what your friends are up to.'
          : 'Create an account to join the neighborhood.'}
      </p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && (
          <div className="field">
            <label htmlFor="auth-name">Name</label>
            <input
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {error && <p className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <Link to="/login" onClick={(e) => { e.preventDefault(); setMode('register'); setError(''); }}>
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link to="/login" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); }}>
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
