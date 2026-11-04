function requireStudent(req, res, next) {
  if (req.session.studentId) return next();
  res.status(401).json({ error: 'Nicht eingeloggt' });
}

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'Kein Zugriff' });
}

// Dateiendung für Uploads aus dem geprüften MIME-Typ ableiten – nie aus dem
// Originalnamen. Sonst landet z. B. eine als „image/png“ deklarierte .svg- oder
// .xhtml-Datei mit Skript auf der Kolosseum-Domain (gespeichertes XSS).
const ENDUNG_FUER_TYP = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'application/pdf': '.pdf', 'text/plain': '.txt', 'text/html': '.html', 'application/xhtml+xml': '.html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/zip': '.zip', 'application/x-zip-compressed': '.zip',
};
function sichereEndung(mimetype) {
  return ENDUNG_FUER_TYP[mimetype] || '.bin';
}

module.exports = { requireStudent, requireAdmin, sichereEndung };
