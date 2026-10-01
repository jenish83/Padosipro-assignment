import express from 'express';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { schemas, validate } from '../validation.js';
import { signToken } from '../middleware/auth.js';
import { AppError, badRequest, unauthorized, forbidden, conflict } from '../errors.js';

export default function authRoutes({ db, otp, mailer }) {
  const router = express.Router();
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const cooldownSeconds = Math.ceil(config.otp.resendCooldownMs / 1000);

  /** Issue a code and email it. If the email fails we revoke the code so the cooldown can't lock the user out. */
  async function issueAndSend(user, opts) {
    const code = otp.issue(user.id, opts);
    try {
      await mailer.sendOtp(user.email, code);
    } catch (err) {
      console.error('Failed to send OTP email:', err.message);
      otp.revokeLatest(user.id);
      throw new AppError(502, 'EMAIL_SEND_FAILED', "We couldn't send the verification email. Please try again in a moment.");
    }
  }

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { email, password } = validate(schemas.register, req.body);
    const existing = byEmail.get(email);

    if (existing && existing.email_verified) {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists. Please log in.', { fields: { email: 'This email is already registered.' } });
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    let user = existing;
    if (existing) {
      // Unverified account being re-registered (e.g. the user lost the first email): take the new password.
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existing.id);
    } else {
      const info = db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)').run(email, passwordHash, Date.now());
      user = { id: info.lastInsertRowid, email };
    }

    try {
      await issueAndSend(user);
    } catch (err) {
      // Still inside the resend cooldown: a code was sent moments ago, so just carry on to the verify screen.
      if (err.code !== 'OTP_COOLDOWN') throw err;
    }
    res.status(201).json({
      message: 'Account created. We emailed you a 6-digit code.',
      email,
      resendAfterSeconds: Math.max(otp.resendWaitSeconds(user.id), 0) || cooldownSeconds,
    });
  });

  // POST /api/auth/verify-email
  router.post('/verify-email', async (req, res) => {
    const { email, code } = validate(schemas.verifyEmail, req.body);
    const user = byEmail.get(email);
    // Same message as a wrong code so this endpoint can't be used to discover registered emails.
    if (!user) throw badRequest('OTP_NOT_FOUND', 'No active code. Please request a new one.');
    if (user.email_verified) return res.json({ message: 'Email already verified. Please log in.', verified: true });

    otp.verify(user.id, code);
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
    res.json({ message: 'Email verified. You can now log in.', verified: true });
  });

  // POST /api/auth/resend-otp
  router.post('/resend-otp', async (req, res) => {
    const { email } = validate(schemas.resendOtp, req.body);
    const user = byEmail.get(email);
    // Do not reveal whether the account exists / is verified.
    if (user && !user.email_verified) await issueAndSend(user);
    res.json({ message: 'If this email needs verification, a new code is on its way.', resendAfterSeconds: cooldownSeconds });
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, password } = validate(schemas.login, req.body);
    const user = byEmail.get(email);
    if (!user) throw unauthorized('USER_NOT_FOUND', `🔍 No account found for ${email}. Please create an account first.`);
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw unauthorized('INVALID_CREDENTIALS', 'Incorrect email or password.');

    if (!user.email_verified) {
      // Correct password but unverified: send a fresh code (best effort) and tell the app to open the verify screen.
      try {
        await issueAndSend(user, { enforceCooldown: true });
      } catch (_) {
        /* cooldown or mail hiccup: user can press "Resend" on the verify screen */
      }
      throw forbidden('EMAIL_NOT_VERIFIED', 'Please verify your email to continue.', {
        details: { email: user.email, resendAfterSeconds: otp.resendWaitSeconds(user.id) || cooldownSeconds },
      });
    }

    res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
  });

  return router;
};
