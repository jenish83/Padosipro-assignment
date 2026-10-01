import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';
import config from '../src/config.js';
import { generateCode, hashCode, createOtpService } from '../src/services/otp.js';

describe('OTP helpers', () => {
  test('generateCode always returns exactly 6 digits (including leading zeros)', () => {
    for (let i = 0; i < 2000; i++) assert.match(generateCode(), /^\d{6}$/);
  });

  test('hashCode is deterministic, keyed and bound to the user', () => {
    assert.equal(hashCode(1, '123456'), hashCode(1, '123456'));
    assert.notEqual(hashCode(1, '123456'), hashCode(2, '123456'));
    assert.notEqual(hashCode(1, '123456', 'secret-a'), hashCode(1, '123456', 'secret-b'));
    assert.notEqual(hashCode(1, '123456'), '123456');
  });
});

describe('OTP service', () => {
  let ctx, otp, userId;
  beforeEach(async () => {
    ctx = await createTestContext();
    otp = createOtpService(ctx.db, ctx.now);
    userId = ctx.db.prepare("INSERT INTO users (email, password_hash, created_at) VALUES ('a@b.co','x',1)").run().lastInsertRowid;
  });

  afterEach(() => ctx.close());

  test('stores only a hash, never the plain code', () => {
    const code = otp.issue(userId);
    const row = ctx.db.prepare('SELECT * FROM otps WHERE user_id = ?').get(userId);
    assert.notEqual(row.code_hash, code);
    assert.equal(row.code_hash, hashCode(userId, code));
    assert.equal(row.expires_at - row.created_at, 10 * 60 * 1000);
  });

  test('correct code verifies once, then cannot be reused (single use)', () => {
    const code = otp.issue(userId);
    otp.verify(userId, code);
    assert.throws(() => otp.verify(userId, code), { code: 'OTP_NOT_FOUND' });
  });

  test('code is valid just before 10 minutes and expired after', () => {
    const code = otp.issue(userId);
    ctx.advance(10 * 60 * 1000 - 1000);
    assert.doesNotThrow(() => otp.verify(userId, code));

    const code2 = (ctx.advance(config.otp.resendCooldownMs), otp.issue(userId));
    ctx.advance(10 * 60 * 1000);
    assert.throws(() => otp.verify(userId, code2), { code: 'OTP_EXPIRED' });
  });

  test('wrong code reports attempts left, and is locked after 5 wrong attempts', () => {
    const code = otp.issue(userId);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let left = 4; left >= 1; left--) {
      assert.throws(() => otp.verify(userId, wrong), (e) => e.code === 'OTP_INVALID' && e.details.attemptsLeft === left);
    }
    assert.throws(() => otp.verify(userId, wrong), { code: 'OTP_LOCKED' }); // 5th wrong attempt
    // Even the correct code is rejected once locked.
    assert.throws(() => otp.verify(userId, code), { code: 'OTP_LOCKED' });
  });

  test('resend is blocked during the cooldown and allowed afterwards', () => {
    otp.issue(userId);
    assert.throws(() => otp.issue(userId), (e) => e.code === 'OTP_COOLDOWN' && e.details.retryAfterSeconds === 30);
    ctx.advance(config.otp.resendCooldownMs);
    assert.doesNotThrow(() => otp.issue(userId));
  });

  test('issuing a new code invalidates the previous one', () => {
    const first = otp.issue(userId);
    ctx.advance(config.otp.resendCooldownMs);
    const second = otp.issue(userId);
    if (first !== second) assert.throws(() => otp.verify(userId, first), { code: 'OTP_INVALID' });
    assert.doesNotThrow(() => otp.verify(userId, second));
  });

  test('verify with no code issued fails cleanly', () => {
    assert.throws(() => otp.verify(userId, '123456'), { code: 'OTP_NOT_FOUND' });
  });
});
