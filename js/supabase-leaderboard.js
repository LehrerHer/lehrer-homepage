// ══════════════════════════════════════════════════════════════════
// Geteilte Bestenliste via Supabase REST API
//
// Einrichtung (einmalig, ca. 5 Minuten):
//  1. Konto anlegen auf https://supabase.com (kostenlos)
//  2. Neues Projekt erstellen
//  3. Im SQL-Editor (Dashboard › SQL Editor) folgenden Code ausführen:
//
//       CREATE TABLE quiz_bestenliste (
//         id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
//         quiz    text   NOT NULL,
//         name    text   NOT NULL,
//         punkte  int    NOT NULL,
//         maximum int    NOT NULL,
//         prozent int    NOT NULL,
//         datum   timestamptz DEFAULT now()
//       );
//       ALTER TABLE quiz_bestenliste ENABLE ROW LEVEL SECURITY;
//       CREATE POLICY "Alle dürfen lesen"
//         ON quiz_bestenliste FOR SELECT USING (true);
//       CREATE POLICY "Alle dürfen eintragen"
//         ON quiz_bestenliste FOR INSERT WITH CHECK (true);
//
//  4. URL und anon-Key unten eintragen:
//     Dashboard › Settings › API › Project URL  →  SUPABASE_URL
//     Dashboard › Settings › API › anon public  →  SUPABASE_ANON_KEY
// ══════════════════════════════════════════════════════════════════

var SUPABASE_URL      = 'YOUR_SUPABASE_URL';        // z.B. https://abcxyz.supabase.co
var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';   // langer anon-Key aus Settings › API

var _sbAktiv = SUPABASE_URL !== 'YOUR_SUPABASE_URL';

// ─── CSS für Bestenlisten-Elemente (einmalig injiziert) ───────────
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
  if (!_sbAktiv) return false;
  var prozent = maximum > 0 ? Math.round(punkte / maximum * 100) : 0;
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/quiz_bestenliste', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        quiz: String(quiz).slice(0, 60),
        name: (String(name || 'Anonym').trim() || 'Anonym').slice(0, 20),
        punkte: +punkte,
        maximum: +maximum,
        prozent: prozent
      })
    });
    return res.ok;
  } catch (e) { return false; }
}

// ─── Top-N abrufen ────────────────────────────────────────────────
async function leaderboardFetch(quiz, limit) {
  if (!_sbAktiv) return null;
  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/quiz_bestenliste'
        + '?quiz=eq.' + encodeURIComponent(quiz)
        + '&order=prozent.desc,punkte.desc,datum.asc'
        + '&limit=' + (limit || 10),
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } }
    );
    return res.ok ? await res.json() : [];
  } catch (e) { return []; }
}

// ─── HTML-Darstellung ─────────────────────────────────────────────
function leaderboardHTML(eintraege) {
  if (!_sbAktiv) return '<p class="lb-hinweis">🔧 Geteilte Bestenliste: Supabase noch nicht konfiguriert.<br><small>Anleitung in <code>js/supabase-leaderboard.js</code></small></p>';
  if (eintraege === null) return '<p class="lb-loading">Lädt…</p>';
  if (!eintraege.length) return '<p class="lb-leer">Noch keine Einträge – sei der erste! 🚀</p>';
  var m = ['🥇', '🥈', '🥉'];
  return '<div class="lb-table">'
    + '<div class="lb-row lb-head"><span class="lb-rang">#</span><span>Name</span><span>Score</span><span style="text-align:right">Datum</span></div>'
    + eintraege.map(function (e, i) {
      return '<div class="lb-row">'
        + '<span class="lb-rang">' + (i < 3 ? m[i] : (i + 1) + '.') + '</span>'
        + '<span>' + _esc(e.name) + '</span>'
        + '<span class="lb-score">' + e.prozent + '%<span class="lb-sub"> (' + e.punkte + '/' + e.maximum + ')</span></span>'
        + '<span class="lb-datum">' + (e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '–') + '</span>'
        + '</div>';
    }).join('')
    + '</div>';
}

function _esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
