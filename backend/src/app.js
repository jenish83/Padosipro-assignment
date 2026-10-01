import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config.js';
import { createOtpService } from './services/otp.js';
import { requireAuth } from './middleware/auth.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';

/** Builds the Express app. db / mailer / clock are injected so tests can use in-memory doubles. */
function createApp({ db, mailer, now }) {
  const app = express();
  const otp = createOtpService(db, now);

  app.use(cors());
  app.use(express.json({ limit: '50kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const authLimiter = config.rateLimitEnabled
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) =>
          res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a few minutes.' } }),
      })
    : (_req, _res, next) => next();

  app.use('/api/auth', authLimiter, authRoutes({ db, otp, mailer }));
  app.use('/api', meRoutes({ db, requireAuth: requireAuth(db) }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export { createApp };
