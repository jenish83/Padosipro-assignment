import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// All configuration lives here so the rest of the code never reads process.env directly.
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 4000),
  dbPath: process.env.DB_PATH || './data/padosipro.db',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Secret used to HMAC OTP codes before storing them (a plain hash of a 6-digit code is trivially brute-forced).
  otpSecret: process.env.OTP_SECRET || 'dev-only-otp-secret',

  otp: {
    length: 6,
    ttlMs: 10 * 60 * 1000, // valid for 10 minutes
    maxAttempts: 5, // wrong attempts allowed per code
    resendCooldownMs: num(process.env.OTP_RESEND_COOLDOWN_SECONDS, 30) * 1000,
  },

  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 10),

  mail: {
    // "smtp" sends via SMTP (Mailpit in Docker), "console" just prints the email to the terminal.
    transport: process.env.MAIL_TRANSPORT || 'smtp',
    host: process.env.SMTP_HOST || 'localhost',
    port: num(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'PadosiPro <no-reply@padosipro.local>',
  },

  rateLimitEnabled: process.env.RATE_LIMIT !== 'off' && process.env.NODE_ENV !== 'test',
};

if (config.env === 'production' && config.jwtSecret === 'dev-only-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

export default config;
