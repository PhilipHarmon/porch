const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the Bearer JWT and attaches req.user = { id }.
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Attaches req.user when a valid Bearer token is present; otherwise
// continues anonymously (used for public endpoints that personalize
// when a viewer is logged in).
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id };
    } catch {
      // Invalid token — treat as anonymous rather than failing.
    }
  }
  return next();
}

module.exports = { authRequired, optionalAuth, adminRequired };

// Requires a logged-in admin. Attaches req.user = { id, isAdmin: true }.
function adminRequired(req, res, next) {
  authRequired(req, res, async () => {
    try {
      const user = await User.findById(req.user.id).select('isAdmin');
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required.' });
      }
      req.user.isAdmin = true;
      return next();
    } catch (err) {
      return next(err);
    }
  });
}
