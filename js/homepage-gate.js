/**
 * homepage-gate.js – Steuert die sichtbaren Sektionen auf index.html.
 * Öffentlich: Hero, Was-ist-neu, Kontakt.
 * Geschützt: Lernkolosseum-Teaser, Materialien, Blog.
 * Prüft die Kolosseum-Session und blendet Sektionen entsprechend ein/aus.
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';

  var PROTECTED_IDS = ['lernkolosseum', 'digitale-materialien', 'blog-teaser'];
  var GATE_ID       = 'homepage-login-gate';

  function setProtectedVisible(visible) {
    PROTECTED_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = visible ? '' : 'none';
    });
    var gate = document.getElementById(GATE_ID);
    if (gate) gate.style.display = visible ? 'none' : '';
  }

  fetch(K + '/api/auth/me', { credentials: 'include' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (user) {
      var eingeloggt = !!(user && user.nick);
      setProtectedVisible(eingeloggt);
      if (eingeloggt) {
        var adminLink = document.getElementById('admin-footer-link');
        if (adminLink) {
          adminLink.textContent = 'Eingeloggt als ' + user.nick + ', Rang ' + (user.xp || 0);
          adminLink.removeAttribute('aria-hidden');
        }
      }
    })
    .catch(function () {
      setProtectedVisible(false);
    });
})();
