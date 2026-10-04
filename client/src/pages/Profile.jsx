import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { apiError } from '../utils.js';
import Avatar from '../components/Avatar.jsx';
import FriendButton from '../components/FriendButton.jsx';
import PostCard from '../components/PostCard.jsx';

// Public profile. Own profile gets an edit form; others get a FriendButton.
export default function Profile() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit form state (own profile only).
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const targetId = id === 'me' ? user?.id : id;
  const isOwn = user && targetId === user.id;

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    try {
      const [{ data: p }, { data: postData }] = await Promise.all([
        api.get(`/users/${targetId}`),
        api.get('/posts', { params: { author: targetId, limit: 20 } }),
      ]);
      setProfile(p);
      setPosts(postData.items || []);
      setName(p.name);
      setBio(p.bio || '');
      setAvatarUrl(p.avatarUrl || '');
      setCoverUrl(p.coverUrl || '');
    } catch (err) {
      setError(apiError(err, 'Could not load this profile.'));
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/users/me', { name, bio, avatarUrl, coverUrl });
      setProfile((prev) => ({ ...prev, ...data }));
      setUser(data);
      setEditing(false);
    } catch (err) {
      setError(apiError(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="narrow">
        <p className="muted">Loading profile…</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="narrow">
        <p className="alert alert-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="narrow">
      <div
        className="profile-cover"
        style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined}
      />
      <div className="profile-head">
        <div className="profile-avatar-wrap">
          <Avatar user={profile} size={96} />
        </div>
        <div className="profile-info">
          <h1>{profile.name}</h1>
          <p className="muted">
            {profile.friendCount} {profile.friendCount === 1 ? 'friend' : 'friends'}
          </p>
        </div>
        <div className="profile-actions">
          {isOwn ? (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing((e) => !e)}>
              {editing ? 'Cancel' : 'Edit profile'}
            </button>
          ) : (
            <FriendButton targetId={profile.id} status={profile.friendship} onChange={load} />
          )}
        </div>
      </div>

      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      {isOwn && editing && (
        <form className="profile-edit" onSubmit={saveProfile}>
          <div className="field">
            <label htmlFor="pf-name">Name</label>
            <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pf-bio">Bio</label>
            <textarea id="pf-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
          </div>
          <div className="field">
            <label htmlFor="pf-avatar">Avatar image URL</label>
            <input id="pf-avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-cover">Cover image URL</label>
            <input id="pf-cover" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          </div>
          {error && <p className="alert alert-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      <h2 className="section-title">Posts</h2>
      {posts.length === 0 && <p className="muted">No posts yet.</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={(pid) => setPosts((prev) => prev.filter((p) => p.id !== pid))} />
      ))}
    </div>
  );
}
