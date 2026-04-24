function requireStudent(req, res, next) {
  if (req.session && req.session.studentId) return next();
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Nicht eingeloggt' });
  }
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  res.redirect('/admin');
}

module.exports = { requireStudent, requireAdmin };
