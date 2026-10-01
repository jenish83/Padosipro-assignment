# PadosiPro

Native mobile app (React Native + Expo) and API for the first user journey: **register → verify email with a 6-digit code → log in → profile (once) → pick tasks → home.**

```
padosipro/
├── backend/             Node.js + Express + SQLite
├── mobile/              Expo (TypeScript), native screens
├── docker-compose.yml   Optional: API + Mailpit inbox
└── DESIGN.md            Architecture and trade-offs
```

## Run it in about 10 minutes

You need three things already installed:

1. **Node.js 22.13 or newer** (`node -v`). The API uses Node's built-in SQLite. [nodejs.org](https://nodejs.org/)
2. **Expo Go** on your phone (same Wi-Fi as this computer), from the Play Store or App Store. Expo SDK 57.
3. Two terminals, both opened in this folder.

An Android emulator works too. You do not need Docker or Android Studio for this path.

### 1. Start the API

The code is printed in this terminal. Nothing else has to be running.

**PowerShell**

```powershell
cd backend
npm install
node -e "require('fs').writeFileSync('.env', 'MAIL_TRANSPORT=console\n')"
npm start
```

**macOS / Linux / Git Bash**

```bash
cd backend
npm install
node -e "require('fs').writeFileSync('.env', 'MAIL_TRANSPORT=console\n')"
npm start
```

Leave this terminal open. You should see `PadosiPro API listening on http://0.0.0.0:4000  (mail: console)`.

Check it: open <http://localhost:4000/health>. The response is `{"status":"ok"}`.

The database file and the 24-task catalogue are created on this first start (`backend/data/`).

### 2. Point the app at that API

The phone cannot use `localhost`. It has to use this computer's address.

| Where the app runs | Put this in `mobile/.env` as `EXPO_PUBLIC_API_URL` |
|---|---|
| Phone on the same Wi-Fi | `http://<this computer's IPv4>:4000` |
| Android emulator | `http://10.0.2.2:4000` (already the example default) |
| iOS Simulator | `http://localhost:4000` |

Find the IPv4 address:

- Windows: `ipconfig` → Wi-Fi → **IPv4 Address** (often `192.168.x.x`)
- macOS: `ipconfig getifaddr en0`
- Linux: `hostname -I`

Example for a phone: `EXPO_PUBLIC_API_URL=http://192.168.1.10:4000`

### 3. Start the app

**PowerShell**

```powershell
cd mobile
npm install
Copy-Item .env.example .env
notepad .env
npx expo start
```

**macOS / Linux / Git Bash**

```bash
cd mobile
npm install
cp .env.example .env
# edit EXPO_PUBLIC_API_URL, then:
npx expo start
```

In `.env`, set `EXPO_PUBLIC_API_URL` from the table above, save, then start Expo. If you edit `.env` after Expo is already running, stop it and run `npx expo start -c`.

Scan the QR code with Expo Go (Android: the Expo Go app; iPhone: the Camera app). Or press `a` if an Android emulator is already running.

### 4. Walk through it

1. **Create an account.** Password: 8+ characters, with a letter and a number.
2. Look at the **API terminal**. A line like `[mail:console] Your PadosiPro verification code: 123456` is the code. Type it on Verify (it submits when the 6th digit is in).
3. **Log in** with the same email and password.
4. **Profile** (shown once): name, 10-digit Indian mobile (starts with 6–9), address. Business name can be left blank.
5. **Tasks:** search, tick a few, **Review**, then **Confirm and save**.
6. **Home** lists those tasks. Fully close the app and open it again: you are still logged in. **Log out** returns you to Login.

Wrong codes show attempts remaining. Resend is available after 30 seconds.

## If it does not come up

| What you see | What to do |
|---|---|
| `node -v` is below 22.13 | Install Node 22 from [nodejs.org](https://nodejs.org/), open a new terminal, run `node -v` again |
| App says it cannot reach the server | Backend terminal must still be on "listening". `EXPO_PUBLIC_API_URL` must match the table above. Phone and computer on the same Wi-Fi. Restart with `npx expo start -c` |
| No verification code | It is in the API terminal, prefixed `[mail:console]`. This path does not send real email |
| Register fails with a mail error | `backend/.env` must contain `MAIL_TRANSPORT=console`, then restart `npm start` |
| Phone never connects, browser on the computer does | Windows Firewall: allow Node.js on private networks when the prompt appears |
| Port 4000 is taken | Set `PORT=4001` in `backend/.env`, restart the API, and use `:4001` in `EXPO_PUBLIC_API_URL` |
| Want a clean slate | Stop the API and delete the `backend/data/` folder |

## Optional: OTP in a browser (Docker)

If Docker Desktop is installed and you would rather read the code in a web inbox:

```bash
docker compose up --build
```

- API: <http://localhost:4000/health>
- Inbox: <http://localhost:8025> (every code shows up here)

Skip step 1 above. Still do steps 2–4. Reset with `docker compose down -v`.

## Tests

```bash
cd backend && npm test
cd mobile && npm test && npm run typecheck
```

Backend tests cover OTP hashing, expiry, single use, attempt limit, resend cooldown, registration, login (unverified users refused), profile and task validation, and the error shape.

## Build an APK

`EXPO_PUBLIC_API_URL` is baked in at build time. Set it to an address the phone can reach (this computer's LAN IP, or a deployed URL).

**EAS (no Android Studio)**

```bash
cd mobile
# edit eas.json → build.preview.env.EXPO_PUBLIC_API_URL
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

EAS prints a download link for the `.apk` when the build finishes.

**Local (JDK 17 + Android SDK).** Replace the IP with yours.

PowerShell:

```powershell
cd mobile
npm install
$env:EXPO_PUBLIC_API_URL="http://192.168.1.10:4000"
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleRelease
```

macOS / Linux:

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000 npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`.

Plain `http://` is allowed (`usesCleartextTraffic` in `app.json`) so a LAN backend works. Use HTTPS for a real deployment.

## Environment variables

Defaults are enough for the steps above. Copy `backend/.env.example` only if you want to change them.

### Backend (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DB_PATH` | `./data/padosipro.db` | SQLite file |
| `JWT_SECRET` | dev value | Signs login tokens. Set a long random value outside local dev (production refuses the default) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `OTP_SECRET` | dev value | HMAC key for stored OTP codes |
| `MAIL_TRANSPORT` | `smtp` | `console` prints the code in the terminal. `smtp` sends it (Mailpit or any SMTP server) |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Mailpit defaults |
| `SMTP_USER` / `SMTP_PASS` | empty | Authenticated SMTP |
| `MAIL_FROM` | `PadosiPro <no-reply@padosipro.local>` | Sender |
| `OTP_RESEND_COOLDOWN_SECONDS` | `30` | Resend cooldown |
| `BCRYPT_ROUNDS` | `10` | Password hash cost |

### Mobile (`mobile/.env`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL as seen from the device |

## API

Errors all look like `{ "error": { "code", "message", "fields"?, "details"? } }`.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | none | `{email, password}` → unverified user, sends OTP |
| `POST /api/auth/verify-email` | none | `{email, code}` → verifies (`OTP_INVALID` / `OTP_EXPIRED` / `OTP_LOCKED`) |
| `POST /api/auth/resend-otp` | none | `{email}` → new code (30 s cooldown → 429 `OTP_COOLDOWN`) |
| `POST /api/auth/login` | none | `{email, password}` → `{token}`. Unverified → 403 `EMAIL_NOT_VERIFIED` |
| `GET /api/me` | Bearer | user, profile, `profileCompleted`, selected tasks |
| `PUT /api/me/profile` | Bearer | `{name, mobile, address, businessName?}` |
| `GET /api/tasks` | Bearer | catalogue (24 tasks, 5 categories) |
| `PUT /api/me/tasks` | Bearer | `{taskIds: number[]}` replaces the selection |
