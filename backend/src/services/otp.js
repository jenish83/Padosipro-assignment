import crypto from 'node:crypto';
import config from '../config.js';
import { badRequest, tooMany } from '../errors.js';

// ---- Pure helpers (easy to unit test) -------------------------------------

/** Cryptographically random, zero-padded 6-digit code. */
function generateCode(length = config.otp.length) {
  return String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');
}

/**
 * HMAC-SHA256(secret, userId:code). A plain SHA-256 of a 6-digit code can be reversed in
 * microseconds, so we key it with a server secret and bind it to the user.
 */
function hashCode(userId, code, secret = config.otpSecret) {
  return crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// ---- Persistence-backed operations ----------------------------------------

function createOtpService(db, now = () => Date.now()) {
  const latest = db.prepare('SELECT * FROM otps WHERE user_id = ? ORDER BY id DESC LIMIT 1');

  /** Seconds the user must still wait before asking for another code (0 = can resend now). */
  function resendWaitSeconds(userId) {
    const last = latest.get(userId);
    if (!last) return 0;
    const remaining = last.created_at + config.otp.resendCooldownMs - now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /** Issue a new code, invalidating every previous one. Returns the plain code (to be emailed). */
  function issue(userId, { enforceCooldown = true } = {}) {
    if (enforceCooldown) {
      const wait = resendWaitSeconds(userId);
      if (wait > 0) {
        throw tooMany('OTP_COOLDOWN', `Please wait ${wait}s before requesting another code.`, {
          details: { retryAfterSeconds: wait },
        });
      }
    }
    const code = generateCode();
    const t = now();
    db.transaction(() => {
      db.prepare('UPDATE otps SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(t, userId);
      db.prepare('INSERT INTO otps (user_id, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
        userId,
        hashCode(userId, code),
        t + config.otp.ttlMs,
        t
      );
    })();
    return code;
  }

  /** Verify a submitted code. Throws an AppError describing exactly what went wrong. */
  function verify(userId, code) {
    const row = latest.get(userId);
    if (!row || row.used_at) {
      throw badRequest('OTP_NOT_FOUND', 'No active code. Please request a new one.');
    }
    if (row.expires_at <= now()) {
      throw badRequest('OTP_EXPIRED', 'This code has expired. Please request a new one.');
    }
    if (row.attempts >= config.otp.maxAttempts) {
      throw tooMany('OTP_LOCKED', 'Too many wrong attempts. Please request a new code.');
    }

    if (!safeEqual(row.code_hash, hashCode(userId, code))) {
      const attempts = row.attempts + 1;
      db.prepare('UPDATE otps SET attempts = ? WHERE id = ?').run(attempts, row.id);
      const left = config.otp.maxAttempts - attempts;
      if (left <= 0) {
        throw tooMany('OTP_LOCKED', 'Too many wrong attempts. Please request a new code.');
      }
      throw badRequest('OTP_INVALID', `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`, {
        details: { attemptsLeft: left },
      });
    }

    // Single use: mark consumed atomically; if another request beat us to it, reject.
    const res = db.prepare('UPDATE otps SET used_at = ? WHERE id = ? AND used_at IS NULL').run(now(), row.id);
    if (res.changes === 0) throw badRequest('OTP_NOT_FOUND', 'No active code. Please request a new one.');
  }

  /** Remove the newest code (used when the email could not be sent, so the cooldown does not lock the user out). */
  function revokeLatest(userId) {
    db.prepare('DELETE FROM otps WHERE id = (SELECT MAX(id) FROM otps WHERE user_id = ?)').run(userId);
  }

  return { issue, verify, resendWaitSeconds, revokeLatest };
}

export { generateCode, hashCode, createOtpService };
