# DESIGN.md

## Architecture

```
 React Native (Expo)  ──HTTPS/JSON──▶  Express API  ──▶  SQLite
  AuthContext (status)                  routes → services   users, otps,
  API client + SecureStore              zod validation      profiles, tasks,
                                        JWT auth            user_tasks
                                             └──▶ SMTP (Mailpit)
```

**Backend** (`backend/src`): `routes/` are thin; `services/otp.js` holds all OTP rules and `services/mailer.js` sends email;
`validation.js` (zod) validates every input; `middleware/` handles JWT auth and one central error handler so every failure has the shape
`{error:{code,message,fields?}}`. `app.js` takes the DB, mailer and clock as arguments, which is what makes the OTP logic testable
(fake clock for expiry/cooldown, fake mailer to read codes).

**Mobile** (`mobile/src`): a single `AuthContext` holds one `status` (`signedOut → needsProfile → needsTasks → ready`) derived from
`GET /api/me`. The navigator renders only the screens allowed for that status, so the flow can't be skipped or shown twice
("profile once" is simply `profileCompleted === false`). All network calls go through one client with timeout, typed errors and
automatic logout on an invalid session. The JWT is kept in the OS keystore (`expo-secure-store`), so users stay logged in after a restart.

## Key decisions and trade-offs

- **OTP security**: 6-digit codes from `crypto.randomInt`, stored as `HMAC-SHA256(secret, userId:code)`. A plain hash of a 6-digit code can be reversed instantly, so a server-side key is used. Rules: 10-minute expiry, single use (atomic `UPDATE ... WHERE used_at IS NULL`), max 5 wrong attempts per code, 30 s resend cooldown, a new code invalidates older ones.
- **Passwords**: bcrypt (`bcryptjs`, pure JS so it installs everywhere). Login for an email with no account returns `USER_NOT_FOUND` and names that email; a wrong password on an existing account still returns `INVALID_CREDENTIALS`.
- **Verify does not log you in**: after OTP success the user goes to Login, exactly as the brief describes. Login for an unverified user returns 403 `EMAIL_NOT_VERIFIED` (only when the password is right) and the app routes to the verify screen.
- **SQLite via Node's built-in `node:sqlite`**: zero setup, one file, and no native module to compile (an earlier `better-sqlite3` attempt failed to install on machines without a C++ toolchain). It is marked experimental in Node, which is acceptable here. Queries are plain SQL with a tiny schema; moving to PostgreSQL means swapping `db.js` and the prepared statements.
- **Business Name is optional**: PadosiPro serves households, and many customers have no business. The field stays in the form and is stored as `NULL` when blank.
- **Plain JavaScript on the backend, TypeScript on the app**: keeps the API easy to read and run (`node src/server.js`, no build step); the app benefits more from types because of navigation params and API shapes.
- **Client validation mirrors the server**: instant inline feedback, but the server remains the authority; server field errors are displayed inline too.
- **Cleartext HTTP allowed in the APK** so it can talk to a LAN backend during review. Not for production.

## What I left out

- Automated UI tests for the app (only validators are unit tested); the flow was covered by API integration tests, not device tests.
- Forgot/reset password, change email, account deletion, refresh tokens (a 7-day JWT is used, and expiry logs the user out).
- Per-account (not just per-IP) login throttling and account lockout.
- Offline caching of the task catalogue; push notifications; iOS-specific polish and an IPA.
- Migrations tooling (schema is created idempotently on start).
- Exact pixel parity with app.padosipro.com: I matched brand colour, tagline and flow from the public page, but the site's inner screens sit behind login, so layouts are my interpretation.

## With another week

1. Detox/Maestro end-to-end tests of the whole journey; component tests for forms.
2. PostgreSQL + a migration tool (e.g. Drizzle/Knex), TypeScript on the backend, OpenAPI docs.
3. Refresh-token rotation, per-account rate limiting, email deliverability (SPF/DKIM, templated emails).
4. CI (lint, typecheck, tests, EAS build), deployed staging API over HTTPS, Sentry for crash reporting.
5. Accessibility pass (dynamic font sizes, screen-reader labels review), localisation (Hindi/Gujarati), dark mode.
