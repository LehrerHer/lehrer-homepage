const rateLimit = require('express-rate-limit');

// Schüler-Login: zählt pro IP + Benutzername, damit eine Klasse nicht alle sperrt
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const identifier = (req.body && req.body.identifier)
      ? req.body.identifier.trim().toLowerCase()
      : '';
    return `${ip}:${identifier}`;
  },
  message: { error: 'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.' },
  skipSuccessfulRequests: true,
});

// Registrierung: pro IP, großzügiger (Klassenraum-Szenario)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Registrierungsversuche. Bitte 15 Minuten warten.' },
  skipSuccessfulRequests: true,
});

// Admin-Login: eigener, strikter Limiter – unabhängig von Schüler-Aktivität
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Admin-Anmeldeversuche. Bitte 15 Minuten warten.' },
  skipSuccessfulRequests: true,
});

module.exports = { loginLimiter, registerLimiter, adminLoginLimiter };
