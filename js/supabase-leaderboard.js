/* ============================================================
   GETEILTE BESTENLISTE via Supabase REST API
   Nutzt SUPABASE_URL + SUPABASE_KEY aus js/supabase-config.js
   (muss vor dieser Datei eingebunden sein)
   ============================================================ */

// ─── CSS (einmalig injiziert) ─────────────────────────────────────
(function () {
  var s = document.createElement('style');
  s.textContent = [
    '.lb-wrap{margin-top:24px}',
    '.lb-title{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;opacity:.8}',
    '.lb-table{border:1px solid rgba(128,128,128,.22);border-radius:10px;overflow:hidden;font-size:13px}',
    '.lb-row{display:grid;grid-template-columns:36px 1fr auto 68px;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(128,128,128,.1)}',
    '.lb-row:last-child{border-bottom:none}',
    '.lb-head{font-size:10px;font-weight:700;text-transform:uppercase;opacity:.5}',
    '.lb-rang{text-align:center;font-weight:700}',
    '.lb-score{font-weight:700;text-align:right;white-space:nowrap}',
    '.lb-sub{font-size:11px;font-weight:400;opacity:.55}',
    '.lb-datum{text-align:right;opacity:.45;font-size:11px}',
    '.lb-leer,.lb-loading,.lb-hinweis{text-align:center;padding:14px;opacity:.55;font-size:13px}',
    '.lb-eingabe{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}',
    '.lb-eingabe input{flex:1;min-width:140px;padding:9px 13px;border-radius:8px;font-size:14px;font-family:inherit}',
    '.lb-eingabe button{padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap}',
    '.lb-ok{text-align:center;padding:10px;font-size:13px;font-weight:600;color:#4caf50}'
  ].join('');
  document.head.appendChild(s);
})();

// ─── Eintrag speichern ────────────────────────────────────────────
async function leaderboardSave(quiz, name, punkte, maximum) {
  if (typeof SUPABASE_KONFIGURIERT === 'undefined' || !SUPABASE_KONFIGURIERT) return false;
  var prozent = maximum > 0 ? Math.round(punkte / maximum * 100) : 0;
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/quiz_bestenliste', {
      method: 'POST',
      headers: {
        'apikey':          SUPABASE_KEY,
        'Authorization':   'Bearer ' + SUPABASE_KEY,
        'Content-Type':    'application/json',
        'Prefer':          'return=minimal'
      },
      body: JSON.stringify({
        quiz:    String(quiz).slice(0, 60),
        name:    (String(name || 'Anonym').trim() || 'Anonym').slice(0, 20),
        modus:   String(quiz).replace(/^stilmittel-/, ''),
        punkte:  +punkte,
        maximum: +maximum,
        prozent: prozent
      })
    });
    return res.ok;
  } catch (e) { return false; }
}

// ─── Top-N abrufen ────────────────────────────────────────────────
async function leaderboardFetch(quiz, limit) {
  if (typeof SUPABASE_KONFIGURIERT === 'undefined' || !SUPABASE_KONFIGURIERT) return null;
  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/quiz_bestenliste'
        + '?quiz=eq.' + encodeURIComponent(quiz)
        + '&order=prozent.desc,punkte.desc,datum.asc'
        + '&limit=' + (limit || 10),
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
    );
    return res.ok ? await res.json() : [];
  } catch (e) { return []; }
}

// ─── HTML-Darstellung ─────────────────────────────────────────────
function leaderboardHTML(eintraege) {
  if (typeof SUPABASE_KONFIGURIERT === 'undefined' || !SUPABASE_KONFIGURIERT) {
    return '<p class="lb-hinweis">🔧 Bestenliste nicht konfiguriert.</p>';
  }
  if (eintraege === null) return '<p class="lb-loading">Lädt…</p>';
  if (!eintraege.length) return '<p class="lb-leer">Noch keine Einträge – sei der erste! 🚀</p>';
  var m = ['🥇', '🥈', '🥉'];
  return '<div class="lb-table">'
    + '<div class="lb-row lb-head"><span class="lb-rang">#</span><span>Name</span><span>Score</span><span style="text-align:right">Datum</span></div>'
    + eintraege.map(function (e, i) {
      return '<div class="lb-row">'
        + '<span class="lb-rang">' + (i < 3 ? m[i] : (i + 1) + '.') + '</span>'
        + '<span>' + _lbEsc(e.name) + '</span>'
        + '<span class="lb-score">' + e.prozent + '%<span class="lb-sub"> (' + e.punkte + '/' + e.maximum + ')</span></span>'
        + '<span class="lb-datum">' + (e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '–') + '</span>'
        + '</div>';
    }).join('')
    + '</div>';
}

function _lbEsc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
