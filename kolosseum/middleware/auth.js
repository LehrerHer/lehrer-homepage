function requireStudent(req, res, next) {
  if (req.session.studentId) return next();
  res.status(401).json({ error: 'Nicht eingeloggt' });
}

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'Kein Zugriff' });
}

module.exports = { requireStudent, requireAdmin };
