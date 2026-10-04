const Friendship = require('../models/Friendship');

// Returns the user-id strings of everyone with an accepted friendship
// with the given user (either side of the relationship).
async function getFriendIds(userId) {
  const rows = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  });
  return rows.map((r) =>
    r.requester.toString() === userId.toString() ? r.recipient.toString() : r.requester.toString(),
  );
}

// Friendship status between a viewer and a target user:
// 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none'
async function getFriendshipStatus(viewerId, targetId) {
  const v = viewerId.toString();
  const t = targetId.toString();
  if (v === t) return 'self';

  const fr = await Friendship.findOne({
    $or: [
      { requester: v, recipient: t },
      { requester: t, recipient: v },
    ],
  });
  if (!fr) return 'none';
  if (fr.status === 'accepted') return 'friends';
  return fr.requester.toString() === v ? 'pending_sent' : 'pending_received';
}

module.exports = { getFriendIds, getFriendshipStatus };
