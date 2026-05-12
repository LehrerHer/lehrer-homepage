/**
 * arena-bar.js – Persistente Statusleiste im Lernkolosseum (same-origin)
 */
(function () {
  'use strict';

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

  var css = document.createElement('style');
  css.textContent = [
    '#arena-bar{',
      'position:fixed;bottom:0;left:0;right:0;height:40px;',
      'background:rgba(13,27,46,.95);backdrop-filter:blur(6px);',
      'border-top:1px solid rgba(255,255,255,.08);',
      'color:#fff;display:flex;align-items:center;justify-content:space-between;',
      'padding:0 16px;z-index:8000;',
      'font-family:\'Nunito\',sans-serif;font-size:.8rem;',
      'transition:transform .3s ease;',
    '}',
    '#arena-bar.ab-hidden{transform:translateY(100%);}',
    '.ab-left{display:flex;align-items:center;gap:8px;min-width:0;}',
    '.ab-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}',
    '.ab-chip{',
      'background:rgba(255,255,255,.1);border-radius:4px;',
      'padding:2px 8px;font-size:.72rem;color:rgba(255,255,255,.7);',
    '}',
    '.ab-nick{font-weight:700;}',
    '.ab-btn-sm{',
      'padding:3px 10px;border-radius:5px;font-size:.74rem;font-weight:700;',
      'text-decoration:none;cursor:pointer;border:none;font-family:inherit;',
    '}',
    '.ab-btn-sm-ghost{background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);}',
    '.ab-btn-sm-primary{background:var(--c4,#4361ee);color:#fff;}',
    '.ab-challenge-badge{',
      'display:inline-flex;align-items:center;justify-content:center;',
      'background:#ff4444;color:#fff;border-radius:50%;',
      'width:16px;height:16px;font-size:.65rem;font-weight:800;',
      'margin-left:4px;vertical-align:middle;',
      'animation:ab-badge-pulse 1.2s ease-in-out infinite;',
    '}',
    '@keyframes ab-badge-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.25);}}',
    'body{padding-bottom:40px;}',
    '@media(max-width:480px){.ab-desc{display:none;}}',
  ].join('');
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.id = 'arena-bar';
  document.body.appendChild(bar);

  fetch('/api/auth/me')
    .then(function (r) {
      if (r.ok) {
        return r.json().then(function (d) {
          var lvl = levelName(d.xp || 0);
          bar.innerHTML =
            '<div class="ab-left">'
            + '<span>⚔️</span>'
            + '<span class="ab-nick">' + esc(d.nick) + '</span>'
            + '<span class="ab-chip">' + esc(lvl) + ' &middot; ' + (d.xp || 0) + ' XP</span>'
            + '</div>'
            + '<div class="ab-right">'
            + '<a href="/profil.html" class="ab-btn-sm ab-btn-sm-ghost" id="ab-profil-link">Profil</a>'
            + '</div>';

          // Offene Herausforderungen prüfen
          fetch('/api/arena/herausforderungen')
            .then(function (cr) { return cr.ok ? cr.json() : null; })
            .then(function (cd) {
              if (!cd || !cd.eingehend || !cd.eingehend.length) return;
              var link = document.getElementById('ab-profil-link');
              if (!link) return;
              link.innerHTML = 'Profil <span class="ab-challenge-badge">' + cd.eingehend.length + '</span>';
            })
            .catch(function () {});
        });
      }
      bar.innerHTML =
        '<div class="ab-left">'
        + '<span>⚔️</span>'
        + '<span class="ab-desc" style="color:rgba(255,255,255,.5)">Nicht eingeloggt</span>'
        + '</div>'
        + '<div class="ab-right">'
        + '<a href="/login.html" class="ab-btn-sm ab-btn-sm-ghost">Einloggen</a>'
        + '<a href="/register.html" class="ab-btn-sm ab-btn-sm-primary">Gladiator werden</a>'
        + '</div>';
    })
    .catch(function () {
      bar.classList.add('ab-hidden');
      document.body.style.paddingBottom = '';
    });
})();
