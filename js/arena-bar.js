/**
 * arena-bar.js – Persistente Kolosseum-Statusleiste (statische Seite)
 * Zeigt Einloggen-Status + Level unten auf jeder Seite.
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';
  var LEVELS = [
    { name: 'Rekrut',    xp: 0    },
    { name: 'Gladiator', xp: 100  },
    { name: 'Kämpfer',   xp: 250  },
    { name: 'Krieger',   xp: 500  },
    { name: 'Veteran',   xp: 900  },
    { name: 'Champion',  xp: 1400 },
    { name: 'Legende',   xp: 2000 },
  ];

  function levelName(xp) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xp) return LEVELS[i].name;
    }
    return LEVELS[0].name;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── CSS ── */
  var css = document.createElement('style');
  css.textContent = [
    '#arena-bar{',
      'position:fixed;bottom:0;left:0;right:0;height:44px;',
      'background:linear-gradient(90deg,#0f1d35,#1a2f52);',
      'border-top:1px solid rgba(74,158,218,.25);',
      'color:#fff;display:flex;align-items:center;justify-content:space-between;',
      'padding:0 16px;z-index:8000;',
      'font-family:\'Inter\',system-ui,sans-serif;font-size:.82rem;',
      'box-shadow:0 -2px 12px rgba(0,0,0,.35);',
      'transition:transform .3s ease;',
    '}',
    '#arena-bar.ab-hidden{transform:translateY(100%);}',
    '.ab-left{display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden;}',
    '.ab-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}',
    '.ab-chip{',
      'background:rgba(74,158,218,.18);border:1px solid rgba(74,158,218,.35);',
      'border-radius:5px;padding:2px 9px;font-size:.74rem;color:#7ec8f0;font-weight:600;',
      'white-space:nowrap;',
    '}',
    '.ab-nick{font-weight:700;color:#fff;}',
    '.ab-muted{color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.ab-btn{',
      'padding:5px 13px;border-radius:6px;font-size:.78rem;font-weight:700;',
      'text-decoration:none;cursor:pointer;border:none;font-family:inherit;',
      'white-space:nowrap;',
    '}',
    '.ab-btn-ghost{background:transparent;color:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.22);}',
    '.ab-btn-ghost:hover{background:rgba(255,255,255,.08);}',
    '.ab-btn-primary{background:#4a9eda;color:#fff;}',
    '.ab-btn-primary:hover{background:#3a8ec8;}',
    'body{padding-bottom:44px;}',
    '@media(max-width:520px){',
      '.ab-muted{display:none;}',
      '.ab-btn-ghost{display:none;}',
    '}',
  ].join('');
  document.head.appendChild(css);

  /* ── Element ── */
  var bar = document.createElement('div');
  bar.id = 'arena-bar';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  document.body.appendChild(bar);

  /* ── Fetch & Render ── */
  fetch(K + '/api/auth/me', { credentials: 'include' })
    .then(function (r) {
      if (r.ok) {
        return r.json().then(function (d) {
          var lvl = levelName(d.xp || 0);
          bar.innerHTML =
            '<div class="ab-left">'
            + '<span aria-hidden="true">⚔️</span>'
            + '<span>Eingeloggt als <span class="ab-nick">' + esc(d.nick) + '</span></span>'
            + '<span class="ab-chip">' + esc(lvl) + ' &middot; ' + (d.xp || 0) + '&thinsp;XP</span>'
            + '</div>'
            + '<div class="ab-right">'
            + '<a href="' + K + '/profil.html" class="ab-btn ab-btn-ghost" target="_blank" rel="noopener">Profil&nbsp;→</a>'
            + '</div>';
        });
      }
      /* Nicht eingeloggt */
      bar.innerHTML =
        '<div class="ab-left">'
        + '<span aria-hidden="true">⚔️</span>'
        + '<span class="ab-muted">Lernkolosseum &ndash; Quizze spielen und XP für deinen Gladiator sammeln</span>'
        + '</div>'
        + '<div class="ab-right">'
        + '<a href="' + K + '/login.html" class="ab-btn ab-btn-ghost" target="_blank" rel="noopener">Einloggen</a>'
        + '<a href="' + K + '/register.html" class="ab-btn ab-btn-primary" target="_blank" rel="noopener">Gladiator&nbsp;werden</a>'
        + '</div>';
    })
    .catch(function () {
      bar.classList.add('ab-hidden');
      document.body.style.paddingBottom = '';
    });
})();
