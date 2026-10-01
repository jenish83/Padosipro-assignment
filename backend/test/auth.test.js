import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createTestContext, signUpAndLogin, USER } from './helpers.js';
import config from '../src/config.js';

describe('Auth flow', () => {
  let ctx;
  before(async () => (ctx = await createTestContext()));
  after(() => ctx.close());

  test('register rejects invalid input with per-field messages', async () => {
    const r = await ctx.api('POST', '/api/auth/register', { email: 'nope', password: 'short' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'VALIDATION_ERROR');
    assert.ok(r.body.error.fields.email);
    assert.ok(r.body.error.fields.password);
  });

  test('register stores a bcrypt hash (never the password) and emails a 6-digit code', async () => {
    const r = await ctx.api('POST', '/api/auth/register', USER);
    assert.equal(r.status, 201);
    const row = ctx.db.prepare('SELECT * FROM users WHERE email = ?').get(USER.email);
    assert.notEqual(row.password_hash, USER.password);
    assert.ok(row.password_hash.startsWith('$2'));
    assert.ok(await bcrypt.compare(USER.password, row.password_hash));
    assert.equal(row.email_verified, 0);
    assert.match(ctx.lastCode(USER.email), /^\d{6}$/);
  });

  test('login is refused for an unverified user and points to verification', async () => {
    const r = await ctx.api('POST', '/api/auth/login', USER);
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(r.body.token, undefined);
  });

  test('wrong code is rejected with attempts left; correct code verifies', async () => {
    const good = ctx.lastCode(USER.email);
    const bad = good === '999999' ? '000000' : '999999';
    const wrong = await ctx.api('POST', '/api/auth/verify-email', { email: USER.email, code: bad });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error.code, 'OTP_INVALID');
    assert.equal(wrong.body.error.details.attemptsLeft, 4);

    const ok = await ctx.api('POST', '/api/auth/verify-email', { email: USER.email, code: good });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.verified, true);
  });

  test('resend is rate limited by the cooldown', async () => {
    const email = 'cooldown@example.com';
    await ctx.api('POST', '/api/auth/register', { email, password: 'Passw0rd!' });
    const first = ctx.lastCode(email);
    const r = await ctx.api('POST', '/api/auth/resend-otp', { email });
    assert.equal(r.status, 429);
    assert.equal(r.body.error.code, 'OTP_COOLDOWN');
    assert.equal(ctx.lastCode(email), first); // no new email went out
    ctx.advance(31_000);
    assert.equal((await ctx.api('POST', '/api/auth/resend-otp', { email })).status, 200);
  });

  test('verified user can log in; unknown email says the user does not exist', async () => {
    const ok = await ctx.api('POST', '/api/auth/login', USER);
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const wrongPw = await ctx.api('POST', '/api/auth/login', { ...USER, password: 'Wrong1234' });
    assert.equal(wrongPw.status, 401);
    assert.equal(wrongPw.body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(wrongPw.body.error.message, 'Incorrect email or password.');

    const unknown = await ctx.api('POST', '/api/auth/login', { email: 'ghost@example.com', password: 'Wrong1234' });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.error.code, 'USER_NOT_FOUND');
    assert.equal(unknown.body.error.message, '🔍 No account found for ghost@example.com. Please create an account first.');
  });

  test('registering an already verified email is a 409', async () => {
    const r = await ctx.api('POST', '/api/auth/register', USER);
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'EMAIL_TAKEN');
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await ctx.api('GET', '/api/me')).status, 401);
    assert.equal((await ctx.api('GET', '/api/me', undefined, 'garbage')).status, 401);
  });

  test('a token for an unverified user is refused (tokens are only issued after verification)', async () => {
    const id = ctx.db.prepare("INSERT INTO users (email, password_hash, created_at) VALUES ('u@x.co','x',1)").run().lastInsertRowid;
    const token = jwt.sign({ sub: Number(id) }, config.jwtSecret);
    const r = await ctx.api('GET', '/api/me', undefined, token);
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'EMAIL_NOT_VERIFIED');
  });

  test('unknown routes and bad JSON use the standard error shape', async () => {
    const r = await ctx.api('GET', '/api/nope');
    assert.equal(r.status, 404);
    assert.ok(r.body.error.code && r.body.error.message);

    const bad = await fetch(ctx.base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'INVALID_JSON');
  });
});

describe('Profile and tasks', () => {
  let ctx, token;
  before(async () => {
    ctx = await createTestContext();
    token = await signUpAndLogin(ctx);
  });
  after(() => ctx.close());

  test('new user has no profile yet', async () => {
    const r = await ctx.api('GET', '/api/me', undefined, token);
    assert.equal(r.body.profileCompleted, false);
    assert.deepEqual(r.body.selectedTasks, []);
  });

  test('profile validates Indian mobile numbers and required fields', async () => {
    const bad = await ctx.api('PUT', '/api/me/profile', { name: 'J', mobile: '12345', address: 'x' }, token);
    assert.equal(bad.status, 400);
    assert.ok(bad.body.error.fields.name && bad.body.error.fields.mobile && bad.body.error.fields.address);
    const startsWith5 = await ctx.api('PUT', '/api/me/profile', { name: 'Jenish', mobile: '5876543210', address: '12 MG Road' }, token);
    assert.equal(startsWith5.status, 400);
  });

  test('profile saves, normalises +91, and business name is optional', async () => {
    const r = await ctx.api('PUT', '/api/me/profile', { name: ' Jenish ', mobile: '+91 98765-43210', address: '12 MG Road, Vadodara' }, token);
    assert.equal(r.status, 200);
    assert.equal(r.body.profile.mobile, '9876543210');
    assert.equal(r.body.profile.name, 'Jenish');
    assert.equal(r.body.profile.businessName, null);
    assert.equal(r.body.profileCompleted, true);
  });

  test('catalogue has at least 20 tasks across at least 4 categories', async () => {
    const r = await ctx.api('GET', '/api/tasks', undefined, token);
    assert.ok(r.body.tasks.length >= 20);
    assert.ok(new Set(r.body.tasks.map((t) => t.category)).size >= 4);
    for (const t of r.body.tasks) assert.ok(t.name && t.category && t.description);
  });

  test('task selection saves, replaces, and rejects empty or unknown ids', async () => {
    const { tasks } = (await ctx.api('GET', '/api/tasks', undefined, token)).body;
    const first = await ctx.api('PUT', '/api/me/tasks', { taskIds: [tasks[0].id, tasks[1].id, tasks[1].id] }, token);
    assert.equal(first.body.selectedTasks.length, 2);
    const second = await ctx.api('PUT', '/api/me/tasks', { taskIds: [tasks[2].id] }, token);
    assert.deepEqual(second.body.selectedTasks.map((t) => t.id), [tasks[2].id]);

    assert.equal((await ctx.api('PUT', '/api/me/tasks', { taskIds: [] }, token)).status, 400);
    assert.equal((await ctx.api('PUT', '/api/me/tasks', { taskIds: [99999] }, token)).body.error.code, 'UNKNOWN_TASK');
  });
});
