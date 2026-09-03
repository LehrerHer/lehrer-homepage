/**
 * kolosseum-prompt.js – XP-Modal nach Quiz-Abschluss (statische Seite)
 * Verwendung: window.kolosseumReport(score, total, 'quizSlug')
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';

  /* ── CSS ── */
  var css = document.createElement('style');
  css.textContent = [
    '#kp-overlay{',
      'position:fixed;inset:0;background:rgba(5,10,20,.82);',
      'z-index:9500;display:flex;align-items:center;justify-content:center;',
      'opacity:0;pointer-events:none;transition:opacity .25s;',
      'padding:16px;',
    '}',
    '#kp-overlay.kp-open{opacity:1;pointer-events:all;}',
    '#kp-box{',
      'background:#0f1d35;',
      'border:1px solid rgba(74,158,218,.45);',
      'border-radius:18px;padding:36px 28px 28px;',
      'max-width:380px;width:100%;text-align:center;',
      'font-family:\'Inter\',system-ui,sans-serif;color:#fff;',
      'position:relative;',
      'transform:scale(.88);transition:transform .28s cubic-bezier(.34,1.56,.64,1);',
      'box-shadow:0 24px 64px rgba(0,0,0,.7);',
    '}',
    '#kp-overlay.kp-open #kp-box{transform:scale(1);}',
    '#kp-close{',
      'position:absolute;top:12px;right:16px;',
      'background:none;border:none;color:rgba(255,255,255,.4);',
      'font-size:1.5rem;cursor:pointer;line-height:1;padding:4px;',
    '}',
    '#kp-close:hover{color:rgba(255,255,255,.7);}',
    '.kp-emoji{font-size:3rem;display:block;margin-bottom:10px;}',
    '.kp-title{font-size:1.15rem;font-weight:700;margin-bottom:8px;}',
    '.kp-sub{color:rgba(255,255,255,.65);font-size:.9rem;margin-bottom:22px;line-height:1.5;}',
    '.kp-sub strong{color:#7ec8f0;}',
    '.kp-btn{',
      'display:block;width:100%;padding:12px;border-radius:10px;',
      'font-weight:700;font-size:.95rem;font-family:inherit;',
      'text-decoration:none;border:none;cursor:pointer;',
      'margin-bottom:10px;transition:filter .15s;',
    '}',
    '.kp-btn:hover{filter:brightness(1.1);}',
    '.kp-btn-primary{background:#4a9eda;color:#fff;}',
    '.kp-btn-outline{background:transparent;color:#4a9eda;border:2px solid #4a9eda;}',
    '.kp-dismiss{',
      'background:none;border:none;color:rgba(255,255,255,.35);',
      'font-size:.8rem;cursor:pointer;font-family:inherit;',
      'margin-top:6px;',
    '}',
    '.kp-dismiss:hover{color:rgba(255,255,255,.6);}',
  ].join('');
  document.head.appendChild(css);

  /* ── Modal-DOM ── */
  function ensureModal() {
    if (document.getElementById('kp-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'kp-overlay';
    overlay.innerHTML =
      '<div id="kp-box">'
      + '<button id="kp-close" aria-label="Schließen">&times;</button>'
      + '<div id="kp-content"></div>'
      + '</div>';
    document.body.appendChild(overlay);
    document.getElementById('kp-close').onclick = closeModal;
    overlay.onclick = function (e) { if (e.target === overlay) closeModal(); };
  }

  function openModal(html) {
    ensureModal();
    document.getElementById('kp-content').innerHTML = html;
    var overlay = document.getElementById('kp-overlay');
    /* kleiner RAF-Trick damit die CSS-Transition anspringt */
    overlay.classList.remove('kp-open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('kp-open');
      });
    });
  }

  function closeModal() {
    var overlay = document.getElementById('kp-overlay');
    if (overlay) overlay.classList.remove('kp-open');
  }

  /* Globale Schließen-Funktion für inline-Buttons */
  window.kpClose = closeModal;

  /* ── Notenpunkte-Berechnung (spiegelt Server-Logik) ── */
  function computeNotenpunkte(score, total) {
    var pct = total > 0 ? (score / total) * 100 : 0;
    if (pct >= 95) return 15;
    if (pct >= 90) return 14;
    if (pct >= 85) return 13;
    if (pct >= 80) return 12;
    if (pct >= 75) return 11;
    if (pct >= 70) return 10;
    if (pct >= 65) return  9;
    if (pct >= 60) return  8;
    if (pct >= 55) return  7;
    if (pct >= 50) return  6;
    if (pct >= 45) return  5;
    if (pct >= 40) return  4;
    if (pct >= 33) return  3;
    if (pct >= 27) return  2;
    if (pct >= 20) return  1;
    return 0;
  }

  /* ── localStorage-Helfer: als Gast gespielte Quizze zwischenspeichern ── */
  var LS_KEY = 'kp_quiz_pending';

  function loadPending() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }

  function savePending(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function addPending(quizSlug, score, total) {
    var list = loadPending().filter(function (e) { return e.quizSlug !== quizSlug; });
    list.push({ quizSlug: quizSlug, score: score, total: total, at: new Date().toISOString() });
    savePending(list);
  }

  /* ── Ergebnis an den Server senden ── */
  async function submitQuiz(quizSlug, score, total) {
    var res = await fetch(K + '/api/external/submit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizSlug: quizSlug, score: score, total: total }),
    });
    return res.ok ? res.json() : null;
  }

  /* ── Als Gast gesammelte Ergebnisse einlösen (nach Login) ── */
  async function claimPending() {
    var pending = loadPending();
    if (!pending.length) return 0;
    var totalClaimed = 0;
    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      var result = await submitQuiz(item.quizSlug, item.score, item.total);
      if (result && result.xpEarned > 0) totalClaimed += result.xpEarned;
    }
    savePending([]);
    return totalClaimed;
  }

  /* ── Haupt-API ── */
  window.kolosseumReport = async function (score, total, quizSlug) {
    var np    = computeNotenpunkte(score, total);
    var xpMax = np * total;

    try {
      var meRes = await fetch(K + '/api/auth/me', { credentials: 'include' });

      if (!meRes.ok) {
        /* ── Gast: lokal speichern + Modal ── */
        addPending(quizSlug, score, total);
        openModal(
          '<span class="kp-emoji">⚔️</span>'
          + '<div class="kp-title">XP noch nicht gutgeschrieben</div>'
          + '<div class="kp-sub">'
          +   'Ergebnis: <strong>' + np + '&thinsp;Notenpunkte</strong> · '
          +   'das wären <strong>' + xpMax + '&thinsp;Kampferfahrung</strong> für deinen Gladiator! '
          +   'Logge dich ein – deine XP werden automatisch gutgeschrieben, sobald du zu dieser Seite zurückkehrst.'
          + '</div>'
          + '<a href="' + K + '/login.html" class="kp-btn kp-btn-primary" target="_blank" rel="noopener">Einloggen &amp; XP sichern</a>'
          + '<a href="' + K + '/register.html" class="kp-btn kp-btn-outline" target="_blank" rel="noopener">🗡️ Gladiator erstellen</a>'
          + '<button class="kp-dismiss" onclick="kpClose()">Ohne Login fortfahren</button>'
        );
        return;
      }

      /* ── Eingeloggt: erst ausstehende (als Gast gespielte) Quizze einlösen ── */
      var pendingXp = await claimPending();

      var result = await submitQuiz(quizSlug, score, total);
      if (!result) return;
      var npp = result.notenpunkte !== undefined ? result.notenpunkte : np;
      var totalXp = result.xpEarned + pendingXp;

      if (pendingXp > 0) {
        // Nachträglich eingelöste Gast-Ergebnisse (+ ggf. aktuelles Quiz)
        openModal(
          '<span class="kp-emoji">📦</span>'
          + '<div class="kp-title">+' + totalXp + '&thinsp;Kampferfahrung!</div>'
          + '<div class="kp-sub">'
          +   (result.xpEarned > 0
                ? '<strong>' + result.xpEarned + '&thinsp;XP</strong> für dieses Quiz + <strong>' + pendingXp + '&thinsp;XP</strong> aus früher ohne Login gespielten Quizzen. ⚔️'
                : '<strong>' + pendingXp + '&thinsp;XP</strong> aus früher ohne Login gespielten Quizzen nachgeholt. ⚔️')
          + '</div>'
          + '<a href="' + K + '/profil.html" class="kp-btn kp-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
          + '<button class="kp-dismiss" onclick="kpClose()">Schließen</button>'
        );
      } else if (result.xpEarned > 0 && result.isImprovement) {
        // Wiederholung mit Verbesserung
        openModal(
          '<span class="kp-emoji">📈</span>'
          + '<div class="kp-title">Verbessert! +' + result.xpEarned + '&thinsp;Kampferfahrung!</div>'
          + '<div class="kp-sub">'
          +   npp + '&thinsp;Notenpunkte · Du hast dein bisheriges Ergebnis übertroffen! ⚔️'
          + '</div>'
          + '<a href="' + K + '/profil.html" class="kp-btn kp-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
          + '<button class="kp-dismiss" onclick="kpClose()">Schließen</button>'
        );
      } else if (result.xpEarned > 0) {
        // Erster Versuch mit XP
        openModal(
          '<span class="kp-emoji">🏆</span>'
          + '<div class="kp-title">+' + result.xpEarned + '&thinsp;Kampferfahrung!</div>'
          + '<div class="kp-sub">'
          +   npp + '&thinsp;Notenpunkte · Dein Gladiator ist stärker geworden. ⚔️'
          + '</div>'
          + '<a href="' + K + '/profil.html" class="kp-btn kp-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
          + '<button class="kp-dismiss" onclick="kpClose()">Schließen</button>'
        );
      } else {
        // Kein Fortschritt (Ergebnis schlechter oder gleich wie bisher)
        openModal(
          '<span class="kp-emoji">⚔️</span>'
          + '<div class="kp-title">Kein neuer Rekord</div>'
          + '<div class="kp-sub">'
          +   'Ergebnis: <strong>' + npp + '&thinsp;Notenpunkte</strong> · '
          +   'Übe weiter – XP gibt es, sobald du dein bisheriges Ergebnis übertriffst!'
          + '</div>'
          + '<a href="' + K + '/quiz.html" class="kp-btn kp-btn-primary" target="_blank" rel="noopener">Mehr Quizze in der Arena →</a>'
          + '<button class="kp-dismiss" onclick="kpClose()">Schließen</button>'
        );
      }
    } catch (e) { /* Fehler still schlucken */ }
  };

  /* ── Ausstehende Gast-Ergebnisse automatisch einlösen: beim Laden und
     wenn der Tab nach dem Login (oft in einem neuen Tab) wieder sichtbar wird ── */
  var autoClaimLaeuft = false;
  async function autoClaim() {
    if (autoClaimLaeuft) return;
    if (!loadPending().length) return;
    autoClaimLaeuft = true;
    try {
      var meRes = await fetch(K + '/api/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        var claimed = await claimPending();
        if (claimed > 0) {
          openModal(
            '<span class="kp-emoji">📦</span>'
            + '<div class="kp-title">+' + claimed + '&thinsp;XP nachgeholt!</div>'
            + '<div class="kp-sub">Früher ohne Login gespielte Quizze wurden eingelöst. ⚔️</div>'
            + '<a href="' + K + '/profil.html" class="kp-btn kp-btn-primary" target="_blank" rel="noopener">Zum Gladiator-Profil →</a>'
            + '<button class="kp-dismiss" onclick="kpClose()">Schließen</button>'
          );
        }
      }
    } catch (e) { /* Fehler still schlucken */ }
    autoClaimLaeuft = false;
  }

  autoClaim();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') autoClaim();
  });
})();
