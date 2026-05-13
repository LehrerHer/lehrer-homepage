/**
 * worksheet-xp.js – XP-Modal nach Arbeitsblatt-Abschluss
 * Verwendung: window.worksheetComplete('worksheet-id', 'Titel', xp)
 *
 * Gäste: XP-Vorschau anzeigen + Ergebnis in localStorage sichern.
 * Nach Login: ausstehende Einträge aus localStorage automatisch einlösen.
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';
  var LS_KEY = 'kp_ws_pending';

  /* ── CSS (identisches Design wie kolosseum-prompt.js) ── */
  var css = document.createElement('style');
  css.textContent = [
    '#kwx-overlay{',
      'position:fixed;inset:0;background:rgba(5,10,20,.82);',
      'z-index:9500;display:flex;align-items:center;justify-content:center;',
      'opacity:0;pointer-events:none;transition:opacity .25s;padding:16px;',
    '}',
    '#kwx-overlay.kwx-open{opacity:1;pointer-events:all;}',
    '#kwx-box{',
      'background:#0f1d35;border:1px solid rgba(74,158,218,.45);',
      'border-radius:18px;padding:36px 28px 28px;',
      'max-width:380px;width:100%;text-align:center;',
      "font-family:'Inter',system-ui,sans-serif;color:#fff;",
      'position:relative;',
      'transform:scale(.88);transition:transform .28s cubic-bezier(.34,1.56,.64,1);',
      'box-shadow:0 24px 64px rgba(0,0,0,.7);',
    '}',
    '#kwx-overlay.kwx-open #kwx-box{transform:scale(1);}',
    '#kwx-close{',
      'position:absolute;top:12px;right:16px;',
      'background:none;border:none;color:rgba(255,255,255,.4);',
      'font-size:1.5rem;cursor:pointer;line-height:1;padding:4px;',
    '}',
    '#kwx-close:hover{color:rgba(255,255,255,.7);}',
    '.kwx-emoji{font-size:3rem;display:block;margin-bottom:10px;}',
    '.kwx-title{font-size:1.15rem;font-weight:700;margin-bottom:8px;}',
    '.kwx-sub{color:rgba(255,255,255,.65);font-size:.9rem;margin-bottom:22px;line-height:1.5;}',
    '.kwx-sub strong{color:#7ec8f0;}',
    '.kwx-btn{',
      'display:block;width:100%;padding:12px;border-radius:10px;',
      'font-weight:700;font-size:.95rem;font-family:inherit;',
      'text-decoration:none;border:none;cursor:pointer;',
      'margin-bottom:10px;transition:filter .15s;',
    '}',
    '.kwx-btn:hover{filter:brightness(1.1);}',
    '.kwx-btn-primary{background:#4a9eda;color:#fff;}',
    '.kwx-btn-outline{background:transparent;color:#4a9eda;border:2px solid #4a9eda;}',
    '.kwx-dismiss{',
      'background:none;border:none;color:rgba(255,255,255,.35);',
      'font-size:.8rem;cursor:pointer;font-family:inherit;margin-top:6px;',
    '}',
    '.kwx-dismiss:hover{color:rgba(255,255,255,.6);}',
  ].join('');
  document.head.appendChild(css);

  /* ── Modal-DOM ── */
  function ensureModal() {
    if (document.getElementById('kwx-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'kwx-overlay';
    overlay.innerHTML =
      '<div id="kwx-box">'
      + '<button id="kwx-close" aria-label="Schließen">&times;</button>'
      + '<div id="kwx-content"></div>'
      + '</div>';
    document.body.appendChild(overlay);
    document.getElementById('kwx-close').onclick = closeModal;
    overlay.onclick = function (e) { if (e.target === overlay) closeModal(); };
  }

  function openModal(html) {
    ensureModal();
    document.getElementById('kwx-content').innerHTML = html;
    var overlay = document.getElementById('kwx-overlay');
    overlay.classList.remove('kwx-open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('kwx-open'); });
    });
  }

  function closeModal() {
    var overlay = document.getElementById('kwx-overlay');
    if (overlay) overlay.classList.remove('kwx-open');
  }

  window.kwxClose = closeModal;

  /* ── localStorage-Helfer ── */
  function loadPending() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }

  function savePending(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function addPending(worksheetId, title, xp) {
    var list = loadPending().filter(function (e) { return e.id !== worksheetId; });
    list.push({ id: worksheetId, title: title, xp: xp, at: new Date().toISOString() });
    savePending(list);
  }

  /* ── XP an Server senden ── */
  async function submitXp(worksheetId, title, xp) {
    var res = await fetch(K + '/api/worksheets/submit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worksheetId: worksheetId, title: title, xp: xp }),
    });
    return res.ok ? res.json() : null;
  }

  /* ── Ausstehende localStorage-Einträge einlösen ── */
  async function claimPending() {
    var pending = loadPending();
    if (!pending.length) return 0;
    var totalClaimed = 0;
    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      if (item.xp >= 1 && item.xp <= 100) {
        var result = await submitXp(item.id, item.title, item.xp);
        if (result && result.xpEarned > 0) totalClaimed += result.xpEarned;
      }
    }
    savePending([]);
    return totalClaimed;
  }

  /* ── Haupt-API ── */
  window.worksheetComplete = async function (worksheetId, title, xp) {
    if (typeof xp !== 'number' || xp < 1) return;

    try {
      var meRes = await fetch(K + '/api/auth/me', { credentials: 'include' });

      if (!meRes.ok) {
        /* ── Gast: lokal speichern + Modal anzeigen ── */
        addPending(worksheetId, title, xp);
        openModal(
          '<span class="kwx-emoji">⚔️</span>'
          + '<div class="kwx-title">XP nicht gespeichert</div>'
          + '<div class="kwx-sub">'
          +   'Du hast <strong>' + xp + '&thinsp;Kampferfahrung</strong> verdient! '
          +   'Logge dich ein und besuche das Arbeitsblatt erneut – deine XP werden dann automatisch gutgeschrieben.'
          + '</div>'
          + '<a href="' + K + '/login.html" class="kwx-btn kwx-btn-primary" target="_blank" rel="noopener">Einloggen &amp; XP sichern</a>'
          + '<a href="' + K + '/register.html" class="kwx-btn kwx-btn-outline" target="_blank" rel="noopener">🗡️ Gladiator erstellen</a>'
          + '<button class="kwx-dismiss" onclick="kwxClose()">Ohne Login fortfahren</button>'
        );
        return;
      }

      /* ── Eingeloggt: erst ausstehende Einträge einlösen, dann aktuelles AB ── */
      var pendingXp = await claimPending();

      var result = await submitXp(worksheetId, title, xp);

      if (!result) return;

      if (result.alreadyDone) {
        if (pendingXp > 0) {
          openModal(
            '<span class="kwx-emoji">📦</span>'
            + '<div class="kwx-title">+' + pendingXp + '&thinsp;XP nachgeholt!</div>'
            + '<div class="kwx-sub">'
            +   'Früher offline abgeschlossene Arbeitsblätter wurden eingelöst. '
            +   'Dieses Blatt hast du bereits abgeschlossen.'
            + '</div>'
            + '<a href="' + K + '/profil.html" class="kwx-btn kwx-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
            + '<button class="kwx-dismiss" onclick="kwxClose()">Schließen</button>'
          );
        }
        return;
      }

      var totalXp = result.xpEarned + pendingXp;

      if (pendingXp > 0) {
        openModal(
          '<span class="kwx-emoji">📦</span>'
          + '<div class="kwx-title">+' + totalXp + '&thinsp;Kampferfahrung!</div>'
          + '<div class="kwx-sub">'
          +   '<strong>' + result.xpEarned + '&thinsp;XP</strong> für dieses Arbeitsblatt'
          +   ' + <strong>' + pendingXp + '&thinsp;XP</strong> aus früher offline abgeschlossenen Blättern. ⚔️'
          + '</div>'
          + '<a href="' + K + '/profil.html" class="kwx-btn kwx-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
          + '<button class="kwx-dismiss" onclick="kwxClose()">Schließen</button>'
        );
      } else {
        openModal(
          '<span class="kwx-emoji">🏆</span>'
          + '<div class="kwx-title">+' + result.xpEarned + '&thinsp;Kampferfahrung!</div>'
          + '<div class="kwx-sub">'
          +   'Arbeitsblatt abgeschlossen. Dein Gladiator ist stärker geworden. ⚔️'
          + '</div>'
          + '<a href="' + K + '/profil.html" class="kwx-btn kwx-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
          + '<button class="kwx-dismiss" onclick="kwxClose()">Schließen</button>'
        );
      }
    } catch (e) { /* Fehler still schlucken */ }
  };

  /* ── Auto-Claim beim Laden: ausstehende XP einlösen ohne Modal-Unterbrechung ── */
  (async function autoClaimOnLoad() {
    var pending = loadPending();
    if (!pending.length) return;
    try {
      var meRes = await fetch(K + '/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) return;
      var claimed = await claimPending();
      if (claimed > 0) {
        openModal(
          '<span class="kwx-emoji">📦</span>'
          + '<div class="kwx-title">+' + claimed + '&thinsp;XP nachgeholt!</div>'
          + '<div class="kwx-sub">'
          +   'Früher ohne Login abgeschlossene Arbeitsblätter wurden eingelöst. ⚔️'
          + '</div>'
          + '<a href="' + K + '/profil.html" class="kwx-btn kwx-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
          + '<button class="kwx-dismiss" onclick="kwxClose()">Schließen</button>'
        );
      }
    } catch (e) {}
  })();

})();
