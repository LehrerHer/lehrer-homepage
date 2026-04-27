const crypto = require('crypto');

function getAdminSecret() {
  return process.env.SESSION_SECRET || 'lerngladiatoren-dev-secret-bitte-aendern';
}

// Prüft den signierten Admin-Cookie (stateless, kein Session-Store nötig)
function isAdminAuthed(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(/(?:^|;\s*)adminAuth=([^;]+)/);
  if (!match) return false;
  const token = decodeURIComponent(match[1]);
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', getAdminSecret())
    .update('admin:' + ts)
    .digest('base64url');
  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

function requireStudent(req, res, next) {
  if (req.session && req.session.studentId) return next();
  res.status(401).json({ error: 'Nicht eingeloggt' });
}

function requireAdmin(req, res, next) {
  if (isAdminAuthed(req)) return next();
  res.status(401).json({ error: 'Nicht autorisiert' });
}

module.exports = { requireStudent, requireAdmin, isAdminAuthed, getAdminSecret };
