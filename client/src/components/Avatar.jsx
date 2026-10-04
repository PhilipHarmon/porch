import React from 'react';

// Round avatar with an initial-letter fallback when no avatarUrl is set.
export default function Avatar({ user, size = 40 }) {
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  };
  if (user && user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name || 'avatar'} style={base} />;
  }
  const initial = (user && user.name ? user.name.trim().charAt(0) : '?').toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        ...base,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--accent-soft)',
        color: 'var(--accent-dark)',
        fontWeight: 700,
        fontSize: size * 0.45,
      }}
    >
      {initial}
    </span>
  );
}
