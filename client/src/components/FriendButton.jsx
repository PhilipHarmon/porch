import React, { useState } from 'react';
import api from '../api.js';

// Renders the right friendship action for a target user:
// Add friend / Request sent / Accept+Decline / Unfriend. Calls onChange
// after a successful action so the parent can refresh status.
export default function FriendButton({ targetId, status, onChange }) {
  const [busy, setBusy] = useState(false);

  async function act(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (onChange) onChange();
    } catch {
      // Parent surfaces errors if it wants; the button just resets.
    } finally {
      setBusy(false);
    }
  }

  if (!targetId || status === 'self') return null;

  if (status === 'friends') {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-small"
        disabled={busy}
        onClick={() => {
          if (window.confirm('Unfriend this person?')) {
            act(() => api.delete(`/friends/${targetId}`));
          }
        }}
      >
        ✓ Friends
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button type="button" className="btn btn-ghost btn-small" disabled>
        Request sent
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <span className="friend-actions">
        <button
          type="button"
          className="btn btn-primary btn-small"
          disabled={busy}
          onClick={() => act(() => api.post('/friends/accept', { requesterId: targetId }))}
        >
          Accept
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={busy}
          onClick={() => act(() => api.post('/friends/decline', { requesterId: targetId }))}
        >
          Decline
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-small"
      disabled={busy}
      onClick={() => act(() => api.post('/friends/request', { recipientId: targetId }))}
    >
      Add friend
    </button>
  );
}
