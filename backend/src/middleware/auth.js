import jwt from 'jsonwebtoken';
import config from '../config.js';
import { unauthorized, forbidden } from '../errors.js';

function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

/** Requires "Authorization: Bearer <jwt>" and attaches req.user (verified users only). */
function requireAuth(db) {
  const findUser = db.prepare('SELECT id, email, email_verified FROM users WHERE id = ?');
  return (req, _res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(unauthorized('UNAUTHENTICATED', 'Please log in to continue.'));

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (e) {
      const expired = e.name === 'TokenExpiredError';
      return next(unauthorized(expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN', expired ? 'Your session has expired. Please log in again.' : 'Invalid session. Please log in again.'));
    }
    const user = findUser.get(payload.sub);
    if (!user) return next(unauthorized('INVALID_TOKEN', 'Invalid session. Please log in again.'));
    if (!user.email_verified) return next(forbidden('EMAIL_NOT_VERIFIED', 'Please verify your email first.'));
    req.user = { id: user.id, email: user.email };
    next();
  };
}

export { signToken, requireAuth };
