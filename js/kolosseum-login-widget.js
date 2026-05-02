/**
 * kolosseum-login-widget.js
 * Zeigt in der Navbar den Kolosseum-Login-Status:
 *  - Eingeloggt  → Avatar-Emoji + Avatarname (klickbar → Profil)
 *  - Ausgeloggt  → "Einloggen"-Button (→ Kolosseum-Login)
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';

  var LEVELS = [
    { name: 'Rekrut',    min: 0    },
    { name: 'Gladiator', min: 100  },
    { name: 'Kämpfer',   min: 250  },
    { name: 'Krieger',   min: 500  },
    { name: 'Veteran',   min: 900  },
    { name: 'Champion',  min: 1400 },
    { name: 'Legende',   min: 2000 },
  ];

  var LEVEL_AVATARS = ['🗡️', '⚔️', '🛡️', '🪖', '🏆', '👑', '🌟'];

  function levelIndex(xp) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].min) return i;
    }
    return 0;
  }

  // CSS injizieren
  var style = document.createElement('style');
  style.textContent = [
    '#kolo-widget{',
      'display:flex;align-items:center;gap:0;',
      'margin-left:0.5rem;',
    '}',
    '.kolo-login-btn{',
      'display:inline-flex;align-items:center;gap:0.35rem;',
      'padding:0.42rem 0.9rem;',
      'background:#4a9eda;color:#fff;',
      'border-radius:6px;font-size:0.82rem;font-weight:700;',
      'text-decoration:none;white-space:nowrap;',
      'border:none;cursor:pointer;font-family:inherit;',
      'transition:background 0.2s;',
    '}',
    '.kolo-login-btn:hover{background:#2e7ab5;}',
    '.kolo-user-chip{',
      'display:inline-flex;align-items:center;gap:0.4rem;',
      'padding:0.35rem 0.8rem;',
      'background:rgba(74,158,218,0.15);',
      'border:1px solid rgba(74,158,218,0.4);',
      'border-radius:6px;font-size:0.82rem;font-weight:700;',
      'color:var(--primary-color,#1e3a5f);',
      'text-decoration:none;white-space:nowrap;',
      'transition:background 0.2s;',
    '}',
    '.kolo-user-chip:hover{background:rgba(74,158,218,0.25);}',
    '.kolo-avatar{font-size:1.1rem;line-height:1;}',
    '.kolo-level{',
      'font-size:0.72rem;font-weight:600;',
      'color:rgba(30,58,95,0.6);',
      'margin-left:0.1rem;',
    '}',
    '@media(max-width:480px){',
      '.kolo-level{display:none;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  var widget = document.getElementById('kolosseum-widget');
  if (!widget) return;

  widget.id = 'kolo-widget';

  function renderLoggedOut() {
    widget.innerHTML = '';
    var a = document.createElement('a');
    a.href      = K + '/login.html';
    a.className = 'kolo-login-btn';
    a.innerHTML = '🏛️ Einloggen';
    widget.appendChild(a);
    widget.style.display = 'flex';
  }

  function renderLoggedIn(nick, xp) {
    var idx    = levelIndex(xp);
    var avatar = LEVEL_AVATARS[idx];
    var level  = LEVELS[idx].name;

    widget.innerHTML = '';
    var a = document.createElement('a');
    a.href      = K + '/profil.html';
    a.className = 'kolo-user-chip';
    a.title     = level + ' · ' + xp + ' XP';
    a.innerHTML = '<span class="kolo-avatar">' + avatar + '</span>'
      + '<span>' + nick.replace(/</g, '&lt;') + '</span>'
      + '<span class="kolo-level">' + level + '</span>';
    widget.appendChild(a);
    widget.style.display = 'flex';
  }

  fetch(K + '/api/auth/me', { credentials: 'include' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.nick) {
        renderLoggedIn(data.nick, data.xp || 0);
      } else {
        renderLoggedOut();
      }
    })
    .catch(function () {
      renderLoggedOut();
    });
})();
