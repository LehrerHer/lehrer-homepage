const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Zu viele Admin-Anmeldeversuche. Bitte 15 Minuten warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

module.exports = { loginLimiter, adminLoginLimiter };
