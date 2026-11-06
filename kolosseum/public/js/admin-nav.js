/* ================================================================
   Admin-Leiste – EINE Navigation für alle Admin-Seiten
   Ersetzt jede <nav class="… admin-nav"> auf der Seite durch dieselbe Leiste
   (gleiche Einträge, aktive Seite markiert, bleibt beim Scrollen sichtbar).

   Einbinden direkt NACH der alten Admin-Leiste (vor den Seiten-Skripten):
     <script src="/js/admin-nav.js"></script>
   Neue Admin-Seite: nur unten in EINTRAEGE ergänzen.
   ================================================================ */
(function () {
  'use strict';

  var EINTRAEGE = [
    { gruppe: 'Übersicht', links: [
      { text: 'Dashboard', url: '/admin/dashboard.html' }
    ] },
    { gruppe: 'Lernende', links: [
      { text: 'Schüler', url: '/admin/schueler.html' },
      { text: 'Blog', url: '/admin/blog.html', badge: 'blog-badge' },
      { text: 'Feedback', url: '/feedback.html' }
    ] },
    { gruppe: 'Inhalte', links: [
      { text: 'Quizze', url: '/admin/quiz.html' },
      { text: 'Vokabeln', url: '/admin/vokabelpakete.html' },
      { text: 'Leseabenteuer', url: '/admin/leseabenteuer.html' },
      { text: 'Deutschclub', url: '/admin/deutschclub.html' },
      { text: 'Informatik', url: '/admin/informatik.html' },
      { text: 'RegelRadar', url: 'https://lehrer-herrmann.de/regelradar-lehrkraft.html' }
    ] },
    { gruppe: 'Fortbildung', links: [
      { text: 'Fortbildung', url: '/admin/fortbildung.html' },
      { text: 'Feedbackbogen', url: '/admin/fortbildung-bogen.html' }
    ] }
  ];

  var STIL =
    '.an-leiste{position:sticky;top:0;z-index:90;background:#12122a;color:#fff;padding:.5rem 1rem;' +
      'display:flex;flex-wrap:nowrap;align-items:center;gap:.4rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.25);font-family:inherit}' +
    '.an-leiste a{text-decoration:none}' +
    '.an-marke{color:#fff;font-weight:800;font-size:1.05rem;margin-right:.4rem;white-space:nowrap}' +
    '.an-gruppen{display:flex;flex-wrap:wrap;gap:.3rem .8rem;align-items:center;flex:1 1 auto;min-width:0}' +
    '.an-gruppe{display:flex;flex-wrap:wrap;gap:.2rem;align-items:center}' +
    '.an-gruppe+.an-gruppe{border-left:1px solid rgba(255,255,255,.2);padding-left:.8rem}' +
    '.an-titel{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.45);margin-right:.25rem}' +
    '.an-link{color:rgba(255,255,255,.8);font-weight:700;font-size:.88rem;padding:.25rem .55rem;border-radius:6px;white-space:nowrap}' +
    '.an-link:hover,.an-link:focus{color:#fff;background:rgba(255,255,255,.12)}' +
    '.an-link.aktiv{color:#12122a;background:#f6c84e}' +
    '.an-link:focus-visible,.an-knopf:focus-visible{outline:3px solid #f6c84e;outline-offset:2px}' +
    '.an-rechts{display:flex;flex-direction:column;gap:.25rem;align-items:flex-end;margin-left:auto;flex:0 0 auto}' +
    '.an-klein{color:rgba(255,255,255,.55);font-size:.8rem;white-space:nowrap}' +
    '.an-klein:hover{color:#fff}' +
    '.an-knopf{background:transparent;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.4);border-radius:6px;' +
      'padding:.25rem .6rem;font:inherit;font-size:.8rem;cursor:pointer}' +
    '.an-knopf:hover{color:#fff;border-color:#fff}' +
    '.an-badge{margin-left:.35rem;background:#e74c3c;color:#fff;border-radius:10px;padding:0 .45rem;font-size:.75rem}' +
    '@media (max-width:900px){.an-leiste{flex-wrap:wrap}.an-rechts{flex-direction:row}}@media (max-width:700px){.an-leiste{position:static}.an-gruppe+.an-gruppe{border-left:0;padding-left:0}.an-titel{display:none}}';

  function istAktiv(url) {
    var pfad = location.pathname.replace(/\/$/, '/index.html');
    if (/^https?:/.test(url)) return location.href.indexOf(url) === 0;
    return pfad === url;
  }

  function bauen() {
    var nav = document.createElement('nav');
    nav.className = 'an-leiste';
    nav.setAttribute('aria-label', 'Admin-Bereich');
    var html = '<a href="/admin/dashboard.html" class="an-marke">⚙️ Admin</a><div class="an-gruppen">';
    EINTRAEGE.forEach(function (g) {
      html += '<div class="an-gruppe" role="group" aria-label="' + g.gruppe + '"><span class="an-titel">' + g.gruppe + '</span>';
      g.links.forEach(function (l) {
        var aktiv = istAktiv(l.url);
        html += '<a href="' + l.url + '" class="an-link' + (aktiv ? ' aktiv' : '') + '"' + (aktiv ? ' aria-current="page"' : '') + '>' +
          l.text + (l.badge ? '<span id="' + l.badge + '" class="an-badge" style="display:none"></span>' : '') + '</a>';
      });
      html += '</div>';
    });
    html += '</div><div class="an-rechts">' +
      '<a href="/api/admin/export" class="an-klein">CSV-Export</a>' +
      '<a href="https://lehrer-herrmann.de" class="an-klein">🏠 Homepage</a>' +
      '<button type="button" id="logout-btn" class="an-knopf">Ausloggen</button></div>';
    nav.innerHTML = html;
    return nav;
  }

  var alt = document.querySelectorAll('nav.admin-nav');
  if (!alt.length) return;
  var stil = document.createElement('style');
  stil.textContent = STIL;
  document.head.appendChild(stil);
  var neu = bauen();
  alt[0].parentNode.replaceChild(neu, alt[0]);
  for (var i = 1; i < alt.length; i++) alt[i].remove();

  // Unter der (ebenfalls klebenden) Hauptnavigation andocken
  function setzeTop() {
    var n = document.querySelector('nav.navbar');
    var cs = n && getComputedStyle(n);
    neu.style.top = (n && (cs.position === 'sticky' || cs.position === 'fixed')) ? n.getBoundingClientRect().height + 'px' : '0';
  }
  setzeTop();
  window.addEventListener('load', setzeTop);
  window.addEventListener('resize', setzeTop);

  // Ausloggen funktioniert auf jeder Seite gleich (Seiten-Skripte dürfen zusätzlich reagieren)
  neu.querySelector('#logout-btn').addEventListener('click', function () {
    fetch('/api/auth/admin/logout', { method: 'POST' }).finally(function () { window.location.href = '/admin/index.html'; });
  });
})();
