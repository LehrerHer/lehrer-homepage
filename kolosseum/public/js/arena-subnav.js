/* ============================================================
   GLADIATORENKÄMPFE – gemeinsame Bereichs-Navigation (Subnav)
   Einbinden direkt unter der globalen Navbar:
     <script src="/js/arena-subnav.js"></script>
   Das Script setzt die Leiste synchron an seiner eigenen Position ein,
   damit Seiten-Scripts den Button #logout-btn sofort finden.
   ============================================================ */
(function () {
  'use strict';

  var EINTRAEGE = [
    { href: '/profil.html',    icon: '🛡️', titel: 'Profil',    info: 'Meine Werte, XP & Chronik' },
    { href: '/charakter.html', icon: '🎭', titel: 'Charakter', info: 'Mein Aussehen gestalten' },
    { href: '/rangliste.html', icon: '🏆', titel: 'Rangliste', info: 'Wer ist wie weit? Angreifen!' },
    { href: '/shop.html',      icon: '🪙', titel: 'Shop',      info: 'Münzen gegen Titel & Effekte' }
  ];

  var pfad = window.location.pathname.replace(/\/$/, '/profil.html');

  var links = EINTRAEGE.map(function (e) {
    var aktiv = pfad === e.href;
    return '<li><a href="' + e.href + '" class="subnav-item' + (aktiv ? ' active' : '') + '"' +
      (aktiv ? ' aria-current="page"' : '') + ' title="' + e.info + '">' +
      '<span class="subnav-icon" aria-hidden="true">' + e.icon + '</span>' +
      '<span class="subnav-text"><span class="subnav-titel">' + e.titel + '</span>' +
      '<span class="subnav-info">' + e.info + '</span></span></a></li>';
  }).join('');

  var html =
    '<nav class="kolosseum-subnav" aria-label="Gladiatorenkämpfe">' +
      '<div class="kolosseum-subnav-inner">' +
        '<a href="/profil.html" class="subnav-brand">' +
          '<span aria-hidden="true">⚔</span> Gladiatorenkämpfe</a>' +
        '<ul class="subnav-links">' + links + '</ul>' +
        '<button id="logout-btn" type="button" class="subnav-logout">Ausloggen</button>' +
      '</div>' +
    '</nav>';

  var skript = document.currentScript;
  if (skript) {
    skript.insertAdjacentHTML('beforebegin', html);
  } else {
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  document.getElementById('logout-btn').addEventListener('click', async function () {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_) { /* trotzdem zur Anmeldung */ }
    window.location.href = '/login.html';
  });
}());
