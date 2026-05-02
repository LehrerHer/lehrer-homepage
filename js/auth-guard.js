/**
 * auth-guard.js – Schützt eine Seite vor nicht-angemeldeten Nutzern.
 * Einbinden als erstes <script> in <head> (ohne defer/async).
 * Versteckt den Body sofort und zeigt ihn erst nach erfolgreichem Auth-Check.
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';

  // Body sofort verstecken (synchron, vor dem Rendern)
  var hideCss = document.createElement('style');
  hideCss.id  = '__ag_hide';
  hideCss.textContent = 'html.__ag_checking body{visibility:hidden!important}';
  document.head.appendChild(hideCss);
  document.documentElement.classList.add('__ag_checking');

  // Wall-CSS (einmalig vorbereiten)
  var wallCss = [
    '#__ag_wall{',
      'position:fixed;inset:0;z-index:99999;',
      'background:linear-gradient(135deg,#0f1d35 0%,#1a2f52 100%);',
      'display:flex;align-items:center;justify-content:center;',
      'font-family:\'Inter\',system-ui,sans-serif;',
    '}',
    '.__ag_box{',
      'background:#fff;border-radius:16px;padding:2.5rem 2rem;',
      'max-width:420px;width:90%;text-align:center;',
      'box-shadow:0 8px 40px rgba(0,0,0,.35);',
    '}',
    '.__ag_icon{font-size:3rem;display:block;margin-bottom:1rem}',
    '.__ag_box h1{font-size:1.4rem;font-weight:700;color:#1e3a5f;margin:0 0 .6rem}',
    '.__ag_box p{color:#555;font-size:.9rem;line-height:1.6;margin:0 0 1.5rem}',
    '.__ag_btn{',
      'display:inline-block;padding:.8rem 1.6rem;',
      'background:#4a9eda;color:#fff;',
      'border-radius:8px;font-size:1rem;font-weight:700;',
      'text-decoration:none;margin-bottom:.75rem;width:100%;box-sizing:border-box;',
    '}',
    '.__ag_btn:hover{background:#2e7ab5}',
    '.__ag_hint{',
      'font-size:.82rem;color:#888;margin-top:.75rem;',
    '}',
    '.__ag_hint a{color:#4a9eda;text-decoration:none}',
    '.__ag_hint a:hover{text-decoration:underline}',
  ].join('');

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function showWall() {
    document.documentElement.classList.remove('__ag_checking');
    document.body.style.visibility = 'hidden';

    var styleEl = document.createElement('style');
    styleEl.textContent = wallCss;
    document.head.appendChild(styleEl);

    var wall = document.createElement('div');
    wall.id = '__ag_wall';
    wall.innerHTML = [
      '<div class="__ag_box">',
        '<span class="__ag_icon">🔒</span>',
        '<h1>Anmeldung erforderlich</h1>',
        '<p>',
          'Diese Seite ist nur für Schülerinnen und Schüler mit einem Kolosseum-Account zugänglich.',
        '</p>',
        '<a href="' + K + '/login.html?next=' + encodeURIComponent(location.href) + '" class="__ag_btn">',
          '🏛️ Jetzt einloggen',
        '</a>',
        '<div class="__ag_hint">',
          'Noch kein Account? Bitte Herrn Herrmann um einen Einladungslink.<br>',
          'Probleme beim Einloggen? <a href="/#kontakt">Herrn Herrmann kontaktieren →</a>',
        '</div>',
      '</div>',
    ].join('');

    if (document.body) {
      document.body.appendChild(wall);
      document.body.style.visibility = '';
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(wall);
        document.body.style.visibility = '';
      });
    }
  }

  function check() {
    fetch(K + '/api/auth/me', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (user) {
        if (user && user.nick) {
          document.documentElement.classList.remove('__ag_checking');
        } else {
          showWall();
        }
      })
      .catch(function () {
        showWall();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
