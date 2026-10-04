import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { apiError } from '../utils.js';
import Avatar from '../components/Avatar.jsx';
import FriendButton from '../components/FriendButton.jsx';

// Friends hub: pending requests, my friends, and user search.
export default function Friends() {
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: reqData }, { data: friendData }] = await Promise.all([
        api.get('/friends/requests'),
        api.get('/friends'),
      ]);
      setRequests(reqData);
      setFriends(friendData);
    } catch (err) {
      setError(apiError(err, 'Could not load friends.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced user search.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/users/search', { params: { q } });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  async function refreshSearch() {
    const q = query.trim();
    if (!q) return;
    try {
      const { data } = await api.get('/users/search', { params: { q } });
      setResults(data);
    } catch {
      // keep old results
    }
  }

  if (loading) {
    return (
      <div className="narrow">
        <p className="muted">Loading friends…</p>
      </div>
    );
  }

  return (
    <div className="narrow">
      <h1>Friends</h1>
      {error && <p className="alert alert-error">{error}</p>}

      <section>
        <h2 className="section-title">Friend requests {requests.length > 0 && `(${requests.length})`}</h2>
        {requests.length === 0 && <p className="muted">No pending requests.</p>}
        {requests.map((r) => (
          <div className="friend-row" key={r.id}>
            <Link to={`/profile/${r.id}`} className="friend-who">
              <Avatar user={r} size={44} />
              <span>
                <span className="friend-name">{r.name}</span>
                {r.bio && <span className="friend-bio">{r.bio}</span>}
              </span>
            </Link>
            <FriendButton targetId={r.id} status="pending_received" onChange={load} />
          </div>
        ))}
      </section>

      <section>
        <h2 className="section-title">My friends {friends.length > 0 && `(${friends.length})`}</h2>
        {friends.length === 0 && <p className="muted">No friends yet — search below to find people.</p>}
        {friends.map((f) => (
          <div className="friend-row" key={f.id}>
            <Link to={`/profile/${f.id}`} className="friend-who">
              <Avatar user={f} size={44} />
              <span>
                <span className="friend-name">{f.name}</span>
                {f.bio && <span className="friend-bio">{f.bio}</span>}
              </span>
            </Link>
            <FriendButton targetId={f.id} status="friends" onChange={load} />
          </div>
        ))}
      </section>

      <section>
        <h2 className="section-title">Find people</h2>
        <div className="field">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search users by name"
          />
        </div>
        {searching && <p className="muted">Searching…</p>}
        {!searching && query.trim() && results.length === 0 && (
          <p className="muted">No one found with that name.</p>
        )}
        {results.map((r) => (
          <div className="friend-row" key={r.id}>
            <Link to={`/profile/${r.id}`} className="friend-who">
              <Avatar user={r} size={44} />
              <span>
                <span className="friend-name">{r.name}</span>
                {r.bio && <span className="friend-bio">{r.bio}</span>}
              </span>
            </Link>
            <FriendButton targetId={r.id} status={r.friendship} onChange={refreshSearch} />
          </div>
        ))}
      </section>
    </div>
  );
}
