import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

/** Fresh in-memory DB, fake mailer that records codes, controllable clock, real HTTP server on a random port. */
async function createTestContext() {
  const db = openDb(':memory:');
  const clock = { t: 1_700_000_000_000 };
  const now = () => clock.t;
  const sent = []; // { email, code }
  const mailer = { sendOtp: async (email, code) => void sent.push({ email, code }) };

  const app = createApp({ db, mailer, now });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, body, token) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  const lastCode = (email) => [...sent].reverse().find((m) => m.email === email)?.code;
  const advance = (ms) => void (clock.t += ms);
  const close = () => new Promise((r) => server.close(r));

  return { base, db, api, sent, lastCode, advance, close, now };
}

const USER = { email: 'jenish@example.com', password: 'Passw0rd!' };

/** Register + verify + login, returns the JWT. */
async function signUpAndLogin(ctx, user = USER) {
  await ctx.api('POST', '/api/auth/register', user);
  await ctx.api('POST', '/api/auth/verify-email', { email: user.email, code: ctx.lastCode(user.email) });
  const res = await ctx.api('POST', '/api/auth/login', user);
  return res.body.token;
}

export { createTestContext, signUpAndLogin, USER };
