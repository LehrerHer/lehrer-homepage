/**
 * quiz-engine.js – gemeinsame Quiz-Engine für lehrer-herrmann.de
 *
 * Ein Quiz besteht nur noch aus einer JSON-Datei + dieser HTML-Hülle:
 *
 *   <div id="quiz" data-quiz="/materialien/quiz/<slug>.json"></div>
 *   <script src="/js/quiz-engine.js"></script>        ← vor main.js (baut Navbar/Footer ein)
 *   <script src="/js/main.js"></script>
 *   <script src="/js/kolosseum-login-widget.js"></script>
 *   <script src="/js/api-config.js"></script>
 *   <script src="/js/leaderboard.js"></script>
 *   <script src="/js/kolosseum-prompt.js"></script>
 *
 * Quiz-Typen (Feld "typ" in der JSON):
 *   "mc"/"fragen" Frage für Frage: Multiple Choice, Richtig/Falsch, Lücken, Zuordnung, Sortierung,
 *                 Markierung, Einfärben – optional mit Konfigurationsbildschirm (Filter, Umfang, Modus)
 *   "bilder"      Bilderraten / Rebus (Bild + freie Texteingabe)
 *   "karte"       Stumme Karte mit Hotspots (leicht · mittel · schwer)
 *   "lueckentext" Lückentext ([antwort|alternative] = Eingabe, {richtig|falsch|falsch} = Auswahl)
 *
 * Zentral geregelt (siehe CLAUDE.md „XP, Bestenliste & Lösungsanzeige“):
 *   – XP: window.kolosseumReport(richtig, anzahlFragen, slug) – total ist IMMER die Fragenanzahl
 *   – Bestenliste: leaderboardSave / leaderboardFetch / leaderboardHTML (js/leaderboard.js)
 *   – Lösung zeigen: bei Karte/Lückentext (alle Aufgaben gleichzeitig sichtbar) ein Toggle
 *     („Lösung“ ↔ „Meine Antworten zeigen“); beim ERSTEN Aufdecken wird die XP-würdige Punktzahl
 *     auf den Stand davor eingefroren. Bei MC/Bilderraten (Frage für Frage) verrät „Lösung zeigen“
 *     nur die aktuelle Frage – sie zählt dann 0, die übrigen Fragen bleiben wertbar.
 *   – Bilder als Dateipfade (img/quiz/<quiz>/…), keine Base64-Blöcke
 *
 * Halbe Punkte (Bilderraten: „fast richtig“, Tipp, Fehlversuche) werden intern als Bruch gezählt;
 * für XP und Bestenliste wird auf ganze Fragen gerundet.
 */
(function () {
  'use strict';

  /* ======================================================================
     HILFSFUNKTIONEN
     ====================================================================== */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function norm(s) {
    return String(s == null ? '' : s).trim().toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/\s+/g, ' ');
  }

  function levenshtein(a, b) {
    var m = a.length, n = b.length, i, j;
    var dp = [];
    for (i = 0; i <= m; i++) { dp.push([]); for (j = 0; j <= n; j++) dp[i].push(i || j); }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /* Fisher-Yates (identisch zu den Generator-Quizzen, damit Testläufe vergleichbar bleiben) */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = 0 | Math.random() * (i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function zahl(n) {
    /* 7.5 → „7,5“, 7 → „7“ */
    return String(Math.round(n * 100) / 100).replace('.', ',');
  }

  function $(id) { return document.getElementById(id); }

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* egal */ } }

  /* ======================================================================
     CSS (wird injiziert – die Hülle braucht kein eigenes Stylesheet)
     ====================================================================== */
  var CSS = [
    '.qe-page{--qe-primaer:#1e3a5f;--qe-primaer-hell:#2d6a9f;--qe-akzent:#4a9eda;--qe-ok:#2ecc71;--qe-fehler:#e74c3c;',
    '--qe-teil:#f39c12;--qe-bg:#f4f6f7;--qe-karte:#ffffff;--qe-text:#222;--qe-muted:#555;--qe-rahmen:#e0e4e6;',
    '--qe-ok-bg:rgba(46,204,113,.12);--qe-fehler-bg:rgba(231,76,60,.1);--qe-teil-bg:rgba(243,156,18,.12);--qe-radius:8px;',
    'max-width:760px;margin:0 auto;padding:16px 16px 48px;font-family:system-ui,sans-serif;font-size:17px;line-height:1.5;color:var(--qe-text);text-align:left}',
    '.qe-page.qe-dunkel{--qe-primaer:#f0c040;--qe-primaer-hell:#e0a820;--qe-akzent:#6c8ef5;--qe-bg:#1a1d27;--qe-karte:#1a1d27;',
    '--qe-text:#e8eaf6;--qe-muted:#94a3b8;--qe-rahmen:rgba(255,255,255,.12);--qe-radius:16px}',
    'body.qe-body-dunkel{background:#0f1117}',
    '.qe-page *{box-sizing:border-box}',
    '.qe-kopf{background:var(--qe-primaer);color:#fff;padding:22px 24px;border-radius:var(--qe-radius);margin-bottom:20px}',
    '.qe-dunkel .qe-kopf{background:linear-gradient(135deg,#1a1d27,#22263a);color:var(--qe-text);border:1px solid rgba(240,192,64,.25)}',
    '.qe-kopf h1{margin:0 0 8px;font-size:1.5rem;line-height:1.25;font-family:inherit;color:inherit}',
    '.qe-dunkel .qe-kopf h1{color:var(--qe-primaer)}',
    '.qe-meta{margin:0;font-size:.9rem;opacity:.9}',
    '.qe-karte{background:var(--qe-karte);border-radius:var(--qe-radius);box-shadow:0 1px 3px rgba(0,0,0,.08);padding:1.5rem 1.75rem;margin-bottom:1.25rem;border:1px solid transparent}',
    '.qe-dunkel .qe-karte{border-color:rgba(255,255,255,.08);box-shadow:0 8px 40px rgba(0,0,0,.4)}',
    '.qe-karte h2{color:var(--qe-primaer);font-size:1.05rem;margin:0 0 .75rem;font-family:inherit}',
    '.qe-intro p{margin:0 0 .75rem}.qe-intro p:last-child{margin-bottom:0}',
    '.qe-btn{font-family:inherit;font-size:1rem;min-height:44px;padding:.75rem 1.6rem;border-radius:var(--qe-radius);border:none;cursor:pointer;font-weight:700;text-decoration:none;display:inline-block;line-height:1.3}',
    '.qe-btn:disabled{opacity:.45;cursor:default}',
    '.qe-btn-primaer{background:var(--qe-akzent);color:#fff}.qe-btn-primaer:hover:not(:disabled){background:var(--qe-primaer-hell);color:#fff}',
    '.qe-dunkel .qe-btn-primaer{background:var(--qe-primaer);color:#0f1117}.qe-dunkel .qe-btn-primaer:hover:not(:disabled){background:var(--qe-primaer-hell)}',
    '.qe-btn-sekundaer{background:transparent;color:var(--qe-primaer);border:2px solid var(--qe-primaer)}.qe-btn-sekundaer:hover{background:var(--qe-bg)}',
    '.qe-btn-klein{font-size:.85rem;min-height:36px;padding:.45rem 1rem}',
    '.qe-zentriert{text-align:center}',
    '.qe-aktionen{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin:1.25rem 0 0}',
    '.qe-fortschritt{display:flex;align-items:center;gap:1rem;margin-bottom:1rem;font-size:.85rem;font-weight:700;color:var(--qe-muted)}',
    '.qe-balken{flex:1;background:var(--qe-rahmen);border-radius:50px;height:9px;overflow:hidden}',
    '.qe-balken-f{height:100%;border-radius:50px;background:linear-gradient(90deg,var(--qe-primaer),var(--qe-akzent));transition:width .3s ease}',
    '.qe-frage{font-size:1.15rem;font-weight:700;margin-bottom:1.1rem;color:var(--qe-primaer)}',
    '.qe-optionen{display:flex;flex-direction:column;gap:9px}',
    '.qe-opt{display:flex;align-items:flex-start;gap:12px;width:100%;padding:.85rem 1rem;background:var(--qe-bg);border:2px solid var(--qe-rahmen);border-radius:var(--qe-radius);font-size:.97rem;font-family:inherit;color:var(--qe-text);cursor:pointer;text-align:left;line-height:1.45;transition:border-color .12s,background .12s}',
    '.qe-opt:hover:not(:disabled){border-color:var(--qe-akzent)}.qe-opt:disabled{cursor:default}',
    '.qe-opt-buchstabe{min-width:26px;height:26px;border-radius:50%;background:var(--qe-rahmen);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:var(--qe-muted);flex-shrink:0}',
    '.qe-opt.qe-gewaehlt{border-color:var(--qe-akzent);background:rgba(74,158,218,.1)}',
    '.qe-opt.qe-richtig{background:var(--qe-ok-bg);border-color:var(--qe-ok);color:#1a7a43}.qe-opt.qe-richtig .qe-opt-buchstabe{background:var(--qe-ok);color:#fff}',
    '.qe-dunkel .qe-opt.qe-richtig{color:#7be0a4}',
    '.qe-opt.qe-falsch{background:var(--qe-fehler-bg);border-color:var(--qe-fehler);color:#a93226}.qe-opt.qe-falsch .qe-opt-buchstabe{background:var(--qe-fehler);color:#fff}',
    '.qe-dunkel .qe-opt.qe-falsch{color:#ff9a8f}',
    '.qe-feedback{margin-top:1rem;padding:.85rem 1rem;border-radius:var(--qe-radius);font-size:.92rem;line-height:1.55;display:none}',
    '.qe-feedback.qe-ok{display:block;background:var(--qe-ok-bg);color:#1a7a43;border-left:4px solid var(--qe-ok)}',
    '.qe-feedback.qe-no{display:block;background:var(--qe-fehler-bg);color:#922b21;border-left:4px solid var(--qe-fehler)}',
    '.qe-feedback.qe-teil{display:block;background:var(--qe-teil-bg);color:#8a5a00;border-left:4px solid var(--qe-teil)}',
    '.qe-dunkel .qe-feedback.qe-ok{color:#7be0a4}.qe-dunkel .qe-feedback.qe-no{color:#ff9a8f}.qe-dunkel .qe-feedback.qe-teil{color:#ffc46b}',
    '.qe-feedback-kopf{font-weight:700;margin-bottom:.35rem}',
    '.qe-info{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.88rem;margin-top:.6rem;color:var(--qe-text)}',
    '.qe-info-label{color:var(--qe-muted);font-weight:600}',
    '.qe-wissen{margin:.6rem 0 0;padding:0;list-style:none;font-size:.88rem;color:var(--qe-text)}.qe-wissen li::before{content:"✦ ";color:var(--qe-primaer)}',
    '.qe-weiter{text-align:center;margin-top:1.25rem;display:none}',
    '.qe-hilfe{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:.75rem}',
    '.qe-bild-wrap{position:relative;background:#111318;min-height:200px;display:flex;align-items:center;justify-content:center;border-radius:var(--qe-radius);overflow:hidden;margin:-1.5rem -1.75rem 1.25rem}',
    '.qe-bild{width:100%;max-height:420px;object-fit:contain;display:block}',
    '.qe-badge{position:absolute;top:12px;left:12px;background:rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:4px 14px;font-size:.85rem;font-weight:700;color:#fff;letter-spacing:.06em}',
    '.qe-dunkel .qe-badge{border-color:rgba(240,192,64,.5);color:var(--qe-primaer)}',
    '.qe-eingabe-zeile{display:flex;gap:10px;flex-wrap:wrap}',
    '.qe-eingabe{flex:1;min-width:160px;background:var(--qe-bg);border:1.5px solid var(--qe-rahmen);border-radius:var(--qe-radius);padding:13px 16px;color:var(--qe-text);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s}',
    '.qe-eingabe:focus{border-color:var(--qe-akzent)}',
    '.qe-eingabe.qe-richtig{border-color:var(--qe-ok);background:var(--qe-ok-bg)}',
    '.qe-eingabe.qe-teil{border-color:var(--qe-teil);background:var(--qe-teil-bg)}',
    '.qe-eingabe.qe-falsch{border-color:var(--qe-fehler);background:var(--qe-fehler-bg)}',
    '.qe-notiz{text-align:center;font-size:.8rem;color:var(--qe-muted);font-style:italic;margin:-.6rem 0 .9rem}',
    '.qe-tipp{margin-top:.75rem;padding:.6rem .9rem;border-radius:var(--qe-radius);background:rgba(74,158,218,.1);font-size:.9rem;display:none}',
    '.qe-tipp.qe-offen{display:block}',
    '.qe-punkte{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:40px;padding:6px 16px;font-weight:700;font-size:.95rem;margin-top:10px}',
    '.qe-ergebnis-zahl{font-size:2.6rem;font-weight:900;color:var(--qe-primaer);margin:.25rem 0;line-height:1.1}',
    '.qe-ergebnis-prozent{font-size:1.05rem;color:var(--qe-muted);margin-bottom:.75rem}',
    '.qe-ergebnis-text{font-size:.98rem;margin-bottom:.5rem}',
    '.qe-hinweis{display:block;font-size:.85rem;color:#b06000;margin-top:6px}',
    '.qe-dunkel .qe-hinweis{color:#ffc46b}',
    '.qe-statistik{display:flex;justify-content:center;gap:28px;margin:1rem 0 .5rem;flex-wrap:wrap}',
    '.qe-stat-zahl{font-size:1.8rem;font-weight:900;line-height:1}.qe-stat-label{font-size:.8rem;color:var(--qe-muted);margin-top:2px}',
    '.qe-stat-zahl.g{color:var(--qe-ok)}.qe-stat-zahl.o{color:var(--qe-teil)}.qe-stat-zahl.r{color:var(--qe-fehler)}',
    '.qe-details{text-align:left}',
    '.qe-detail{display:flex;gap:.7rem;padding:.65rem 0;border-bottom:1px solid var(--qe-rahmen);font-size:.87rem;line-height:1.45}',
    '.qe-detail:last-child{border-bottom:none}',
    '.qe-detail-icon{font-size:1rem;flex-shrink:0;margin-top:.1rem}',
    '.qe-detail-antwort{color:var(--qe-muted);margin-top:.15rem;font-size:.83rem}',
    '.qe-bl-eingabe{display:flex;gap:8px;margin:1rem 0;flex-wrap:wrap}',
    '.qe-bl-eingabe input{flex:1;min-width:140px;padding:.7rem 1rem;border-radius:var(--qe-radius);border:1px solid var(--qe-rahmen);font-size:1rem;font-family:inherit;background:var(--qe-bg);color:var(--qe-text)}',
    '.qe-bl-ok{text-align:center;padding:8px;font-size:.9rem;font-weight:600;color:var(--qe-ok)}',
    '.qe-bl-fehler{text-align:center;padding:8px;font-size:.9rem;font-weight:600;color:var(--qe-fehler)}',
    /* Karte */
    '.qe-modi{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:.75rem}',
    '.qe-modus{padding:.45rem .9rem;border-radius:20px;border:2px solid var(--qe-rahmen);background:var(--qe-bg);cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:700;color:var(--qe-muted)}',
    '.qe-modus.qe-aktiv{border-color:var(--qe-akzent);color:var(--qe-primaer);background:rgba(74,158,218,.1)}',
    '.qe-modus-hinweis{font-size:.85rem;color:var(--qe-muted);margin:0 0 .75rem}',
    '.qe-legende{display:inline-flex;align-items:center;gap:6px;margin-right:12px;font-weight:700}.qe-legende::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--qe-g)}',
    '.qe-map{position:relative;display:block;width:100%;line-height:0;user-select:none;-webkit-user-select:none}',
    '.qe-map img{width:100%;height:auto;display:block;border-radius:var(--qe-radius)}',
    '.qe-dot{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:var(--qe-akzent);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer;z-index:2}',
    '.qe-dot:hover{transform:scale(1.15)}',
    '.qe-dot.qe-ok{background:var(--qe-ok)}.qe-dot.qe-fail{background:var(--qe-fehler)}.qe-dot.qe-ziel{outline:3px solid var(--qe-teil)}',
    '.qe-popup{position:absolute;z-index:5;background:#fff;color:#222;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.3);padding:8px;width:200px;line-height:1.3}',
    '.qe-popup-opts{display:flex;flex-direction:column;gap:4px}',
    '.qe-pop-btn{padding:8px 10px;border-radius:6px;border:1px solid #ddd;background:#f8f9fb;font-family:inherit;font-size:.85rem;text-align:left;cursor:pointer}',
    '.qe-pop-btn:hover:not(:disabled){border-color:var(--qe-akzent)}.qe-pop-btn.qe-ok{background:var(--qe-ok);color:#fff;border-color:var(--qe-ok)}.qe-pop-btn.qe-fail{background:var(--qe-fehler);color:#fff;border-color:var(--qe-fehler)}',
    '.qe-dz{position:absolute;z-index:2;transform:translate(-50%,-50%);min-width:60px;max-width:140px}',
    '.qe-dz-lbl{background:rgba(255,255,255,.95);border:2px dashed var(--qe-akzent);border-radius:6px;padding:3px 7px;font-size:.72rem;line-height:1.25;font-weight:700;color:#222;text-align:center;cursor:pointer}',
    '.qe-dz-lbl.qe-gefuellt{border-style:solid}.qe-dz-lbl.qe-ok{border-color:var(--qe-ok);background:#e9f9ee}.qe-dz-lbl.qe-fail{border-color:var(--qe-fehler);background:#fdecea}.qe-dz-lbl.qe-ziel{outline:3px solid var(--qe-teil)}',
    '.qe-hz{position:absolute;z-index:2;transform:translate(-50%,-50%)}',
    '.qe-hz input{width:118px;padding:4px 6px;font-size:.75rem;border:2px solid var(--qe-akzent);border-radius:6px;font-family:inherit;background:rgba(255,255,255,.95);color:#222}',
    '.qe-hz input.qe-ok{border-color:var(--qe-ok)}.qe-hz input.qe-fail{border-color:var(--qe-fehler)}',
    '.qe-bank{display:flex;flex-wrap:wrap;gap:6px;margin:.75rem 0;padding:.75rem;background:var(--qe-bg);border-radius:var(--qe-radius);border:1px solid var(--qe-rahmen)}',
    '.qe-tag{padding:5px 10px;border-radius:20px;background:#fff;border:1px solid var(--qe-rahmen);font-size:.8rem;font-weight:700;cursor:grab;color:#222}',
    '.qe-tag.qe-benutzt{opacity:.35}.qe-tag.qe-gewaehlt{border-color:var(--qe-akzent);background:rgba(74,158,218,.15)}',
    '.qe-loesung-label{position:absolute;transform:translate(-50%,-50%);background:rgba(30,58,95,.9);color:#fff;font-size:.7rem;font-weight:700;padding:2px 6px;border-radius:4px;line-height:1.2;z-index:3;pointer-events:none;white-space:nowrap}',
    /* Lückentext */
    '.qe-text{font-size:1.05rem;line-height:2.1}',
    '.qe-text p{margin:0 0 1rem}.qe-text h3{color:var(--qe-primaer);font-size:1rem;margin:1.25rem 0 .5rem;font-family:inherit}',
    '.qe-luecke{display:inline-block;min-width:90px;padding:2px 8px;margin:0 2px;border:none;border-bottom:2px solid var(--qe-akzent);background:rgba(74,158,218,.08);font:inherit;line-height:1.5;color:var(--qe-text);border-radius:4px 4px 0 0;vertical-align:baseline}',
    '.qe-luecke:focus{outline:2px solid var(--qe-akzent);outline-offset:1px}',
    '.qe-luecke.qe-ok{border-bottom-color:var(--qe-ok);background:var(--qe-ok-bg)}',
    '.qe-luecke.qe-fail{border-bottom-color:var(--qe-fehler);background:var(--qe-fehler-bg);text-decoration:line-through}',
    '.qe-luecke.qe-loesung{border-bottom-color:var(--qe-primaer);background:rgba(30,58,95,.08);font-weight:700;text-decoration:none}',
    '.qe-korrektur{font-size:.8rem;color:#1a7a43;font-weight:700;margin-left:4px}',
    /* Fragen-Typ: Konfiguration, Kontext, weitere Aufgabenarten */
    '.qe-konfig-label{font-family:inherit;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--qe-muted);margin:1rem 0 .4rem}',
    '.qe-konfig-gruppe:first-child .qe-konfig-label{margin-top:0}',
    '.qe-modus small{display:block;font-weight:400;font-size:.72rem;opacity:.8}',
    '.qe-moduskarten{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}',
    '.qe-moduskarte{text-align:left;padding:.7rem .9rem;border-radius:var(--qe-radius);border:2px solid var(--qe-rahmen);background:var(--qe-bg);cursor:pointer;font-family:inherit;color:var(--qe-text);line-height:1.3}',
    '.qe-moduskarte.qe-aktiv{border-color:var(--qe-akzent);background:rgba(74,158,218,.1)}',
    '.qe-moduskarte-icon{display:block;font-size:1.4rem;margin-bottom:4px}.qe-moduskarte strong{display:block;font-size:.9rem}.qe-moduskarte small{display:block;font-size:.75rem;color:var(--qe-muted)}',
    '.qe-badge-zeile{display:flex;align-items:center;gap:8px;margin:0 0 .5rem}.qe-symbol{font-size:1.4rem}',
    '.qe-kat{display:inline-block;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--qe-muted);border:1px solid var(--qe-rahmen);border-radius:20px;padding:2px 9px}',
    '.qe-kontext{margin:0 0 1rem;padding:.7rem 1rem;border-left:4px solid var(--qe-akzent);background:var(--qe-bg);border-radius:0 var(--qe-radius) var(--qe-radius) 0;font-size:1rem;line-height:1.55}',
    '.qe-luecke-zeile{display:grid;grid-template-columns:1fr;gap:4px;margin-bottom:.8rem}.qe-luecke-zeile .qe-eingabe{width:100%}',
    '.qe-paar{display:grid;grid-template-columns:1fr auto;gap:8px 12px;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--qe-rahmen)}',
    '.qe-paar-wahl{min-width:160px;padding:6px 8px;background:var(--qe-bg)}.qe-paar-wahl.qe-ok{border-bottom-color:var(--qe-ok)}.qe-paar-wahl.qe-fail{border-bottom-color:var(--qe-fehler)}',
    '.qe-reihe{list-style:none;margin:0 0 .75rem;padding:0;min-height:44px;border:2px dashed var(--qe-rahmen);border-radius:var(--qe-radius)}',
    '.qe-reihe-el{padding:.5rem .8rem;border-bottom:1px solid var(--qe-rahmen);cursor:pointer}.qe-reihe-el:last-child{border-bottom:none}',
    '.qe-reihe-nr{font-weight:700;color:var(--qe-muted);margin-right:4px}.qe-reihe-el.qe-ok{background:var(--qe-ok-bg)}.qe-reihe-el.qe-fail{background:var(--qe-fehler-bg)}',
    '.qe-marktext{line-height:2.2}.qe-wort{display:inline-block;padding:2px 5px;margin:0 1px;border-radius:5px;cursor:pointer;border:1px solid transparent}',
    '.qe-wort:hover{border-color:var(--qe-akzent)}.qe-wort.qe-sel{background:rgba(74,158,218,.25);border-color:var(--qe-akzent)}',
    '.qe-wort.qe-ok{background:var(--qe-ok-bg);border-color:var(--qe-ok)}.qe-wort.qe-fail{background:var(--qe-fehler-bg);border-color:var(--qe-fehler);text-decoration:line-through}',
    '.qe-wort.qe-fehlt{border-color:var(--qe-ok);border-style:dashed}',
    '.qe-farbpunkt{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:middle}',
    '.qe-tipps{display:flex;gap:6px;flex-wrap:wrap;margin-top:.75rem}',
    '.qe-galerie{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin:1rem 0}',
    '.qe-galerie figure{margin:0;background:var(--qe-bg);border-radius:var(--qe-radius);overflow:hidden;border:1px solid var(--qe-rahmen)}',
    '.qe-galerie img{width:100%;aspect-ratio:1;object-fit:cover;display:block}.qe-galerie figcaption{font-size:.72rem;padding:4px 6px;text-align:center}',
    '@media (max-width:480px){.qe-kopf h1{font-size:1.25rem}.qe-karte{padding:1.1rem 1rem}.qe-bild-wrap{margin:-1.1rem -1rem 1rem}.qe-popup{width:170px}}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  /* ======================================================================
     NAVBAR + FOOTER (nur wenn die Hülle keine eigenen mitbringt)
     – verbindliches Snippet aus CLAUDE.md, mit absoluten Pfaden für materialien/
     ====================================================================== */
  var FAECHER = [
    ['deutsch', 'Deutsch'], ['geschichte', 'Geschichte'], ['informatik', 'Informatik'], ['mathe', 'Mathematik'],
    ['englisch', 'Englisch'], ['sport', 'Sport'], ['biologie', 'Biologie'], ['chemie', 'Chemie'], ['physik', 'Physik'],
    ['musik', 'Musik'], ['erdkunde', 'Erdkunde'], ['gestaltendes-werken', 'Gestaltendes Werken'],
    ['wipo', 'Wirtschaft/Politik'], ['werte-normen', 'Werte &amp; Normen'], null,
    ['ag-projekte', 'AGs &amp; Projekte'], ['faecheruebergreifend', 'Fächerübergreifend']
  ];

  function navItem(href, icon, label, tip, extraCls) {
    return '<li><a href="' + href + '" class="nav-item' + (extraCls ? ' ' + extraCls : '') + '" data-tooltip="' + tip + '">'
      + '<span class="nav-icon" aria-hidden="true">' + icon + '</span><span class="nav-label">' + label + '</span></a></li>';
  }

  function navbarHTML() {
    return '<nav class="navbar" role="navigation" aria-label="Hauptnavigation"><div class="container navbar-inner">'
      + '<a href="/index.html" class="navbar-logo" aria-label="Zur Startseite">'
      + '<img src="/img/logo.svg" alt="" class="navbar-logo-img" width="47" height="38">'
      + '<span class="navbar-logo-text">lehrer-herrmann.de</span></a>'
      + '<button class="hamburger" id="hamburger" aria-label="Menü öffnen" aria-expanded="false" aria-controls="navbar-links"><span></span><span></span><span></span></button>'
      + '<ul class="navbar-links" id="navbar-links">'
      + navItem('/index.html#was-ist-neu', '✨', 'Was ist neu?', 'Was ist neu?')
      + navItem('https://lehrer-herrmann.de/kontakt.html', '✉️', 'Kontakt', 'Kontakt')
      + '<li class="navbar-gb-trenner" aria-hidden="true"><span class="navbar-gb-label">Geschützter Bereich</span></li>'
      + navItem('https://kolosseum.lehrer-herrmann.de/profil.html', '⚔️', 'Arena', 'Arena – Gladiatorenkämpfe', 'navbar-gb-link')
      + navItem('/blog.html', '✍️', 'Blog', 'Schüler*innenblog', 'navbar-gb-link')
      + '<li class="navbar-dropdown"><button class="navbar-dropdown-toggle navbar-gb-link nav-item" aria-expanded="false" aria-haspopup="true" data-tooltip="Fächer" aria-label="Fächer">'
      + '<span class="nav-icon" aria-hidden="true">📚</span><span class="nav-label">Fächer</span></button>'
      + '<ul class="navbar-dropdown-menu" role="menu">'
      + FAECHER.map(function (f) {
          return f ? '<li><a href="/fach-' + f[0] + '.html" role="menuitem">' + f[1] + '</a></li>' : '<li class="dropdown-divider"></li>';
        }).join('')
      + '</ul></li></ul>'
      + '<div id="kolosseum-widget" aria-label="Kolosseum-Anmeldung" style="display:none"></div>'
      + '</div></nav>';
  }

  function footerHTML() {
    return '<footer><div class="container footer-inner">'
      + '<div class="footer-marke"><a href="/index.html" class="footer-logo" aria-label="Zur Startseite">'
      + '<img src="/img/logo.svg" alt="" class="footer-logo-img" width="49" height="40"></a>'
      + '<p>© <span id="footer-jahr">' + new Date().getFullYear() + '</span> Jan Herrmann</p></div>'
      + '<nav class="footer-links" aria-label="Rechtliche Links"><a href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutz</a></nav>'
      + '<a href="https://kolosseum.lehrer-herrmann.de/admin/" id="admin-footer-link" class="admin-footer-link" aria-label="Admin-Bereich">⚙</a>'
      + '</div></footer>';
  }

  function layoutSichern(root) {
    if (!document.querySelector('nav.navbar')) {
      var wrap = document.createElement('div');
      wrap.innerHTML = navbarHTML();
      document.body.insertBefore(wrap.firstChild, document.body.firstChild);
    }
    if (!document.querySelector('footer')) {
      var fw = document.createElement('div');
      fw.innerHTML = footerHTML();
      /* Footer direkt nach dem Quiz-Container, vor den Scripts */
      root.parentNode.insertBefore(fw.firstChild, root.nextSibling);
    }
  }

  /* ======================================================================
     QUIZ-KERN: Zustand, XP, Bestenliste, Lösungs-Sperre
     ====================================================================== */
  var ROOT = document.getElementById('quiz') || document.querySelector('[data-quiz]');
  if (!ROOT) return;

  var daten = null;          // geladene JSON
  var typ = null;            // Typ-Objekt (siehe unten)
  var gesperrt = null;       // eingefrorene Punktzahl (null = noch nicht aufgedeckt)
  var gemeldet = false;      // XP für diesen Durchlauf schon gemeldet?
  var lauf = 0;              // Durchlauf-Zähler (Nochmal spielen)

  function anzahlFragen() { return typ.gesamt(); }

  /* Beim ersten Aufdecken der Lösung Punktzahl einfrieren */
  function loesungAufgedeckt() {
    if (gesperrt === null) gesperrt = typ.aktuell();
  }

  function fairePunkte(roh) {
    return gesperrt !== null ? Math.min(gesperrt, roh) : roh;
  }

  function bewertungsText(pct) {
    var liste = daten.bewertung;
    if (Array.isArray(liste) && liste.length) {
      var sortiert = liste.slice().sort(function (a, b) { return (b.ab || 0) - (a.ab || 0); });
      for (var i = 0; i < sortiert.length; i++) if (pct >= (sortiert[i].ab || 0)) return sortiert[i].text;
      return sortiert[sortiert.length - 1].text;
    }
    if (pct === 100) return 'Perfekt! Alles richtig.';
    if (pct >= 75) return 'Sehr gut! Nur wenige Fehler.';
    if (pct >= 50) return 'Solides Ergebnis – ein zweiter Durchgang lohnt sich.';
    return 'Das braucht noch etwas Übung – probier es gleich noch einmal.';
  }

  /**
   * Zentrale Auswertung. roh = erreichte Punkte (kann Brüche enthalten), extraHTML = typspezifische Zusatzinfos.
   * Meldet XP (einmal pro Durchlauf), zeigt Ergebnis + Bestenliste.
   */
  function auswerten(roh, extraHTML, zielEl) {
    var total = anzahlFragen();
    var fair = fairePunkte(roh);                                   // zählt für XP + Bestenliste
    var fairInt = Math.max(0, Math.min(total, Math.round(fair)));
    var pct = total > 0 ? Math.round(roh / total * 100) : 0;       // Anzeige: tatsächliches Ergebnis

    var box = zielEl || $('qe-ergebnis');
    box.innerHTML = '';
    box.style.display = 'block';

    var k = h('div', 'qe-karte qe-zentriert');
    k.innerHTML =
      '<div class="qe-ergebnis-zahl" id="qe-score">' + zahl(roh) + ' / ' + total + '</div>'
      + '<div class="qe-ergebnis-prozent">' + pct + ' % richtig</div>'
      + '<div class="qe-ergebnis-text">' + esc(bewertungsText(pct)) + '</div>'
      + (gesperrt !== null && fair < roh
          ? '<span class="qe-hinweis">ℹ️ XP nur für <strong>' + zahl(fair) + ' / ' + total + '</strong> richtig <em>ohne</em> Lösungshilfe.</span>'
          : '')
      + (extraHTML || '')
      + '<div class="qe-aktionen">'
      + '<button type="button" class="qe-btn qe-btn-primaer" id="qe-nochmal">🔄 Nochmal spielen</button>'
      + (daten.zurueck && daten.zurueck.url
          ? '<a class="qe-btn qe-btn-sekundaer" href="' + esc(daten.zurueck.url) + '">' + esc(daten.zurueck.text || 'Zurück') + '</a>'
          : '')
      + '</div>';
    box.appendChild(k);
    $('qe-nochmal').onclick = neustart;

    /* Bestenliste */
    if (daten.bestenliste !== false) {
      var bl = h('div', 'qe-karte');
      bl.innerHTML = '<h2>🏆 Bestenliste</h2>'
        + '<div class="qe-bl-eingabe"><input type="text" id="qe-bl-name" placeholder="Dein Name" maxlength="20" aria-label="Name für die Bestenliste">'
        + '<button type="button" class="qe-btn qe-btn-primaer qe-btn-klein" id="qe-bl-speichern">Eintragen</button></div>'
        + '<div id="qe-bl-status"></div><div id="qe-bl-liste"></div>';
      box.appendChild(bl);
      var gespeichert = lsGet('quiz_name');
      if (gespeichert) $('qe-bl-name').value = gespeichert;
      $('qe-bl-speichern').onclick = function () { bestenlisteSpeichern(fairInt, total); };
      bestenlisteLaden();
    }

    /* XP melden – einmal pro Durchlauf */
    if (!gemeldet) {
      gemeldet = true;
      if (typeof window.kolosseumReport === 'function') {
        try { window.kolosseumReport(fairInt, total, daten.slug); } catch (e) { /* still */ }
      }
    }
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* Bestenlisten-ID: Basis (bestenlisteSlug oder slug) + optionaler Modus aus der Konfiguration */
  function lbId() {
    var basis = daten.bestenlisteSlug || daten.slug;
    var m = typ && typeof typ.modus === 'function' ? typ.modus() : '';
    return m ? basis + '-' + m : basis;
  }

  function bestenlisteSpeichern(punkte, total) {
    var inp = $('qe-bl-name'), status = $('qe-bl-status'), btn = $('qe-bl-speichern');
    if (!inp || typeof window.leaderboardSave !== 'function') return;
    var name = (inp.value || '').trim();
    if (!name) { inp.focus(); return; }
    lsSet('quiz_name', name);
    btn.disabled = true;
    window.leaderboardSave(lbId(), name, punkte, total).then(function (ok) {
      status.innerHTML = ok ? '<p class="qe-bl-ok">Gespeichert! 🎉</p>' : '<p class="qe-bl-fehler">Fehler beim Speichern.</p>';
      if (ok) bestenlisteLaden(); else btn.disabled = false;
    });
  }

  function bestenlisteLaden() {
    var el = $('qe-bl-liste');
    if (!el) return;
    if (typeof window.leaderboardFetch !== 'function') { el.innerHTML = ''; return; }
    el.innerHTML = typeof window.leaderboardHTML === 'function' ? window.leaderboardHTML(null) : 'Lädt…';
    window.leaderboardFetch(lbId(), 10).then(function (data) {
      el.innerHTML = typeof window.leaderboardHTML === 'function' ? window.leaderboardHTML(data) : '';
    }).catch(function () { el.innerHTML = ''; });
  }

  function neustart() {
    lauf++;
    gesperrt = null;
    gemeldet = false;
    var erg = $('qe-ergebnis');
    if (erg) { erg.innerHTML = ''; erg.style.display = 'none'; }
    typ.start();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Gerüst: Kopf · Inhalt · Ergebnis */
  function geruest() {
    var dunkel = daten.design && daten.design.thema === 'dunkel';
    ROOT.className = 'qe-page' + (dunkel ? ' qe-dunkel' : '');
    if (dunkel) document.body.classList.add('qe-body-dunkel');
    if (daten.design && daten.design.akzent) ROOT.style.setProperty('--qe-primaer', daten.design.akzent);
    ROOT.innerHTML =
      '<header class="qe-kopf"><h1>' + esc(daten.titel) + '</h1>'
      + (daten.untertitel ? '<p class="qe-meta">' + esc(daten.untertitel) + '</p>' : '')
      + '<div id="qe-kopf-extra"></div></header>'
      + '<div id="qe-inhalt"></div>'
      + '<div id="qe-ergebnis" style="display:none"></div>';
    if (daten.titel && !document.title) document.title = daten.titel + ' – lehrer-herrmann.de';
  }

  function introHTML() {
    var intro = daten.intro;
    if (!intro) return '';
    if (Array.isArray(intro)) return intro.map(function (p) { return /^\s*</.test(p) ? p : '<p>' + p + '</p>'; }).join('');
    return /^\s*</.test(intro) ? intro : '<p>' + intro + '</p>';
  }

  function fortschrittHTML(idx, n, rechts) {
    return '<div class="qe-fortschritt"><span>Frage ' + (idx + 1) + ' / ' + n + '</span>'
      + '<div class="qe-balken"><div class="qe-balken-f" style="width:' + (idx / n * 100) + '%"></div></div>'
      + '<span id="qe-chip">' + rechts + '</span></div>';
  }

  /* ======================================================================
     TYP 1: FRAGEN (Multiple Choice und weitere Aufgabenarten, Frage für Frage)
     typ: "mc" (Alias) oder "fragen"
     fragen: [{art?, frage, kontext?, hinweis?, badge?, symbol?, erklaerung?, gewicht?, …}]
       art "mc"          optionen:[…], richtig: 1 | [0,2]  – oder antwort + Ablenker aus dem Pool (ablenker: 3)
       art "rf"          richtig: true | false (Richtig/Falsch)
       art "luecken"     teile: [{text, antwort}]  – Begriffe eintragen, Teilpunkte
       art "zuordnung"   paare: [{l, r}]           – links → rechts zuordnen (Auswahlfeld), Teilpunkte
       art "sortierung"  elemente: [… in richtiger Reihenfolge], akzeptiert?: [[…]] – Reihenfolge bauen
       art "markierung"  text, ziele: [… Wörter/Wortgruppen] – Wörter im Text anklicken
       art "einfaerben"  woerter: [{t, k}], kategorien: [{wert, label, farbe}] – Wörter einer Kategorie zuordnen
     Quiz-Optionen: mischen, optionenMischen, anzahl, loesungErlaubt, teilpunkte (Standard true),
       ablenker (Zahl: Optionen aus den Antworten anderer Fragen mit gleichem "modus"),
       auswertungNach (Feldname für die Aufschlüsselung im Ergebnis, z. B. "kapitel"),
       konfiguration: { hinweis, gruppen:[{feld, label, art:"einfach"|"mehrfach", optionen?:[{wert|werte, label, beschreibung}],
                        alle?: "Alle", standard?, bestenliste?}], anzahl:{label, optionen:[10,"alle"], standard, bestenliste?},
                        modus:{feld?, label, optionen:[{wert,label,beschreibung,icon}], zufall?: "mixed", bestenliste?} }
     gewicht = Punkte je Frage (Standard 1; einfaerben: Anzahl Wörter) – XP-total ist die Summe der Gewichte
     ====================================================================== */
  var BUCHSTABEN = 'ABCDEFGHIJ';

  function TypFragen() {
    var alle = [], pool = [], cur = 0, punkte = 0, beantwortet = false, verlauf = [], auswahl = [];
    var inhalt, konfig = { werte: {}, anzahl: null, modus: null }, zustand = {};
    var KONF = daten.konfiguration || null;
    var TEILPUNKTE = daten.teilpunkte !== false;
    var gestartet = false;

    /* ── Normalisierung ── */
    function normalisieren(f, i) {
      var q = {}; for (var k in f) q[k] = f[k];
      q.nr = i;
      q.art = f.art || (typeof f.richtig === 'boolean' ? 'rf' : 'mc');
      if (q.art === 'einfaerben') q.gewicht = f.gewicht || (f.woerter || []).length;
      else q.gewicht = f.gewicht || 1;
      return q;
    }

    function gesamt() {
      var liste = gestartet ? pool : alle.length ? alle : (daten.fragen || []).map(normalisieren);
      return liste.reduce(function (a, q) { return a + (q.gewicht || 1); }, 0);
    }
    function aktuell() { return punkte; }
    function modus() {
      if (!KONF) return '';
      var teile = [];
      (KONF.gruppen || []).forEach(function (g) {
        if (!g.bestenliste) return;
        var w = konfig.werte[g.feld];
        if (Array.isArray(w)) teile.push(w.map(function (o) { return o.wert; }).join('+'));
        else if (w && !w.alle) teile.push(w.wert);
      });
      if (KONF.anzahl && KONF.anzahl.bestenliste && konfig.anzahl != null) teile.push(String(konfig.anzahl));
      if (KONF.modus && KONF.modus.bestenliste && konfig.modus) teile.push(konfig.modus.wert);
      return teile.join('-');
    }

    /* ── Filter-Hilfen ── */
    function feldWert(q, feld) { return q[feld]; }
    function passt(q, feld, werte) {
      var v = feldWert(q, feld);
      if (Array.isArray(v)) return v.some(function (x) { return werte.indexOf(x) >= 0; });
      return werte.indexOf(v) >= 0;
    }
    function gruppenWerte(g) {
      var w = konfig.werte[g.feld];
      if (!w) return null;
      if (Array.isArray(w)) { var u = []; w.forEach(function (o) { (o.werte || [o.wert]).forEach(function (x) { if (u.indexOf(x) < 0) u.push(x); }); }); return u; }
      if (w.alle) return null;
      return w.werte || [w.wert];
    }
    function gefiltert(bisGruppe) {
      var liste = alle;
      (KONF.gruppen || []).some(function (g, gi) {
        if (bisGruppe !== undefined && gi >= bisGruppe) return true;
        var werte = gruppenWerte(g);
        if (werte) liste = liste.filter(function (q) { return passt(q, g.feld, werte); });
        return false;
      });
      if (KONF.modus) {
        var feld = KONF.modus.feld || 'modus';
        if (konfig.modus && konfig.modus.wert !== KONF.modus.zufall) {
          liste = liste.filter(function (q) { return q[feld] === konfig.modus.wert; });
        } else if (konfig.modus && KONF.modus.zufall) {
          /* zufällig: je Einheit eine zufällige Variante */
          var je = {};
          liste.forEach(function (q) { var e = q.einheit != null ? q.einheit : q.nr; (je[e] = je[e] || []).push(q); });
          liste = Object.keys(je).map(function (e) { return je[e][0 | Math.random() * je[e].length]; });
        }
      }
      return liste;
    }
    function autoOptionen(g, gi) {
      var liste = gefiltert(gi), werte = [];
      liste.forEach(function (q) {
        var v = feldWert(q, g.feld);
        (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x != null && werte.indexOf(x) < 0) werte.push(x); });
      });
      return werte.map(function (w) { return { wert: w, label: String(w) }; });
    }

    /* ── Start ── */
    function start() {
      inhalt = $('qe-inhalt');
      gestartet = false;
      alle = (daten.fragen || []).map(normalisieren);
      if (KONF) konfigScreen(); else startseite();
    }

    function startseite() {
      inhalt.innerHTML = '<div class="qe-karte qe-intro">' + introHTML()
        + '<div class="qe-zentriert" style="margin-top:1rem"><button type="button" class="qe-btn qe-btn-primaer" id="qe-start">Quiz starten →</button></div></div>';
      $('qe-start').onclick = function () { poolBauen(); if (pool.length) { frageZeigen(); } };
    }

    function konfigScreen() {
      var html = '<div class="qe-karte qe-konfig">' + introHTML() + (KONF.hinweis ? '<p class="qe-modus-hinweis">' + KONF.hinweis + '</p>' : '');
      (KONF.gruppen || []).forEach(function (g, gi) {
        html += '<div class="qe-konfig-gruppe" data-gruppe="' + gi + '"><p class="seitenleiste-titel qe-konfig-label">' + esc(g.label || g.feld) + '</p><div class="qe-modi" id="qe-kg-' + gi + '"></div></div>';
      });
      if (KONF.anzahl) html += '<div class="qe-konfig-gruppe"><p class="qe-konfig-label">' + esc(KONF.anzahl.label || 'Umfang') + '</p><div class="qe-modi" id="qe-kanzahl"></div></div>';
      if (KONF.modus) html += '<div class="qe-konfig-gruppe"><p class="qe-konfig-label">' + esc(KONF.modus.label || 'Spielmodus') + '</p><div class="qe-moduskarten" id="qe-kmodus"></div></div>';
      html += '<p class="qe-modus-hinweis" id="qe-konfig-info"></p>'
        + '<div class="qe-zentriert"><button type="button" class="qe-btn qe-btn-primaer" id="qe-start">Quiz starten →</button></div></div>';
      inhalt.innerHTML = html;
      (KONF.gruppen || []).forEach(function (g, gi) { gruppeRendern(g, gi); });
      anzahlRendern();
      modusRendern();
      infoAktualisieren();
      $('qe-start').onclick = function () { poolBauen(); if (pool.length) frageZeigen(); };
    }

    function gruppeRendern(g, gi, zuruecksetzen) {
      var box = $('qe-kg-' + gi); if (!box) return;
      var optionen = (g.optionen || autoOptionen(g, gi)).slice();
      if (g.alle) optionen.unshift({ wert: '__alle', label: g.alle, alle: true });
      var mehrfach = g.art === 'mehrfach';
      /* Vorbelegung / Bereinigung (abhängige Gruppen starten nach einer Änderung davor wieder mit dem Standard) */
      if (zuruecksetzen) konfig.werte[g.feld] = undefined;
      var aktuellW = konfig.werte[g.feld];
      if (mehrfach) {
        if (!Array.isArray(aktuellW)) {
          aktuellW = g.standard === 'alle' || g.standard === undefined ? optionen.filter(function (o) { return !o.alle; })
            : optionen.filter(function (o) { return [].concat(g.standard).indexOf(o.wert) >= 0; });
        } else {
          aktuellW = aktuellW.filter(function (o) { return optionen.some(function (p) { return p.wert === o.wert; }); });
          if (!aktuellW.length) aktuellW = optionen.filter(function (o) { return !o.alle; });
        }
      } else {
        if (!aktuellW || !optionen.some(function (p) { return p.wert === aktuellW.wert; })) {
          aktuellW = optionen.filter(function (o) { return o.wert === g.standard; })[0] || (g.standard === undefined && g.alle ? optionen[0] : null);
          if (!aktuellW && g.pflicht === false) aktuellW = null;
          if (!aktuellW && g.standard === undefined && !g.alle) aktuellW = optionen[0] || null;
        }
      }
      konfig.werte[g.feld] = aktuellW;
      box.innerHTML = '';
      optionen.forEach(function (o) {
        var aktiv = mehrfach ? aktuellW.some(function (x) { return x.wert === o.wert; }) : (aktuellW && aktuellW.wert === o.wert);
        var b = h('button', 'qe-modus' + (aktiv ? ' qe-aktiv' : ''), esc(o.label) + (o.beschreibung ? '<small>' + esc(o.beschreibung) + '</small>' : ''));
        b.type = 'button'; b.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
        b.onclick = function () {
          if (mehrfach) {
            var liste = konfig.werte[g.feld];
            var pos = -1; liste.forEach(function (x, i) { if (x.wert === o.wert) pos = i; });
            if (pos >= 0) { if (liste.length > 1) liste.splice(pos, 1); } else liste.push(o);
          } else konfig.werte[g.feld] = o;
          /* nachfolgende Gruppen neu aufbauen (abhängige Optionen) */
          (KONF.gruppen || []).forEach(function (g2, gi2) { if (gi2 >= gi) gruppeRendern(g2, gi2, gi2 > gi); });
          anzahlRendern(); infoAktualisieren();
        };
        box.appendChild(b);
      });
    }

    function anzahlRendern() {
      var box = $('qe-kanzahl'); if (!box) return;
      var n = gefiltert().length;
      var optionen = (KONF.anzahl.optionen || ['alle']);
      if (konfig.anzahl == null) konfig.anzahl = KONF.anzahl.standard !== undefined ? KONF.anzahl.standard : optionen[optionen.length - 1];
      box.innerHTML = '';
      optionen.forEach(function (o) {
        var istAlle = o === 'alle';
        if (!istAlle && Number(o) > n && n > 0) return;   /* mehr als vorhanden → ausblenden */
        var label = istAlle ? 'Alle (' + n + ')' : String(o);
        var aktiv = konfig.anzahl === o;
        var b = h('button', 'qe-modus' + (aktiv ? ' qe-aktiv' : ''), esc(label)); b.type = 'button';
        b.onclick = function () { konfig.anzahl = o; anzahlRendern(); infoAktualisieren(); };
        box.appendChild(b);
      });
      if (!box.querySelector('.qe-aktiv') && box.firstChild) { konfig.anzahl = optionen.filter(function (o) { return o === 'alle' || Number(o) <= n; })[0]; anzahlRendern(); }
    }

    function modusRendern() {
      var box = $('qe-kmodus'); if (!box) return;
      var optionen = KONF.modus.optionen || [];
      if (!konfig.modus) konfig.modus = optionen.filter(function (o) { return o.wert === KONF.modus.standard; })[0] || optionen[0];
      box.innerHTML = '';
      optionen.forEach(function (o) {
        var aktiv = konfig.modus && konfig.modus.wert === o.wert;
        var b = h('button', 'qe-moduskarte' + (aktiv ? ' qe-aktiv' : ''),
          (o.icon ? '<span class="qe-moduskarte-icon">' + o.icon + '</span>' : '') + '<strong>' + esc(o.label) + '</strong>' + (o.beschreibung ? '<small>' + esc(o.beschreibung) + '</small>' : ''));
        b.type = 'button'; b.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
        b.onclick = function () { konfig.modus = o; modusRendern(); anzahlRendern(); infoAktualisieren(); };
        box.appendChild(b);
      });
    }

    function infoAktualisieren() {
      var info = $('qe-konfig-info'); if (!info) return;
      var n = gefiltert().length;
      var min = daten.ablenker ? Math.max(1, daten.ablenker + 1) : 1;
      var gewaehlt = (konfig.anzahl == null || konfig.anzahl === 'alle') ? n : Math.min(Number(konfig.anzahl), n);
      info.textContent = n < min ? 'Keine passende Auswahl – bitte mehr Optionen aktivieren.' : gewaehlt + ' von ' + n + ' Fragen werden gespielt.';
      $('qe-start').disabled = n < min;
    }

    /* ── Pool ── */
    function poolBauen() {
      var liste = KONF ? gefiltert() : alle.slice();
      var basis = liste.map(function (q) { var c = {}; for (var k in q) c[k] = q[k]; return c; });
      if (daten.mischen || (KONF && konfig.anzahl != null && konfig.anzahl !== 'alle')) basis = shuffle(basis);
      var n = KONF && konfig.anzahl != null && konfig.anzahl !== 'alle' ? Number(konfig.anzahl) : (daten.anzahl || basis.length);
      if (n < basis.length) basis = basis.slice(0, n);
      /* MC-Optionen aufbereiten (inkl. Ablenker aus dem Pool) */
      basis.forEach(function (q) {
        if (q.art === 'rf') { q.optionen = [{ text: 'Richtig', richtig: q.richtig === true }, { text: 'Falsch', richtig: q.richtig === false }]; q.mehrfach = false; return; }
        if (q.art !== 'mc') return;
        if (q.optionen && q.optionen.length) {
          var richtig = Array.isArray(q.richtig) ? q.richtig.slice() : [q.richtig];
          q.mehrfach = Array.isArray(q.richtig);
          q.optionen = q.optionen.map(function (o, j) { return { text: o, richtig: richtig.indexOf(j) >= 0 }; });
        } else {
          var feld = KONF && KONF.modus ? (KONF.modus.feld || 'modus') : 'modus';
          var quelle = (liste.length >= (daten.ablenker || 3) + 1 ? liste : alle).filter(function (o) { return o[feld] === q[feld] && norm(o.antwort) !== norm(q.antwort); });
          var seen = {}, kandidaten = [];
          shuffle(quelle).forEach(function (o) { var k = norm(o.antwort); if (!seen[k]) { seen[k] = 1; kandidaten.push(o.antwort); } });
          q.optionen = [{ text: q.antwort, richtig: true }].concat(kandidaten.slice(0, daten.ablenker || 3).map(function (t) { return { text: t, richtig: false }; }));
          q.optionen = shuffle(q.optionen);
          q.mehrfach = false;
        }
        if (daten.optionenMischen) q.optionen = shuffle(q.optionen);
      });
      pool = basis; cur = 0; punkte = 0; verlauf = []; gestartet = true;
    }

    /* ── Frage anzeigen ── */
    function kopfHTML(f) {
      return (f.badge || f.symbol ? '<p class="qe-badge-zeile">' + (f.symbol ? '<span class="qe-symbol">' + f.symbol + '</span>' : '') + (f.badge ? '<span class="qe-kat">' + esc(f.badge) + '</span>' : '') + '</p>' : '')
        + '<div class="qe-frage" id="qe-frage">' + f.frage + '</div>'
        + (f.kontext ? '<blockquote class="qe-kontext">' + f.kontext + '</blockquote>' : '')
        + (f.hinweis ? '<p class="qe-modus-hinweis">' + esc(f.hinweis) + '</p>' : '');
    }

    function frageZeigen() {
      var f = pool[cur];
      beantwortet = false; auswahl = []; zustand = {};
      var pruefenNoetig = f.art !== 'mc' && f.art !== 'rf' || f.mehrfach;
      inhalt.innerHTML = '<div class="qe-karte">'
        + fortschrittHTML(cur, pool.length, zahl(punkte) + ' Punkte')
        + kopfHTML(f)
        + (f.mehrfach ? '<p class="qe-modus-hinweis">Mehrere Antworten können richtig sein.</p>' : '')
        + '<div id="qe-aufgabe"></div>'
        + '<div class="qe-feedback" id="qe-feedback"></div>'
        + '<div class="qe-hilfe">'
        + (pruefenNoetig ? '<button type="button" class="qe-btn qe-btn-primaer qe-btn-klein" id="qe-pruefen" disabled>Prüfen</button>' : '')
        + (daten.loesungErlaubt !== false ? '<button type="button" class="qe-btn qe-btn-sekundaer qe-btn-klein" id="qe-loesung">Lösung zeigen</button>' : '')
        + '</div>'
        + '<div class="qe-weiter" id="qe-weiter"><button type="button" class="qe-btn qe-btn-primaer" id="qe-next">'
        + (cur + 1 < pool.length ? 'Nächste Frage →' : 'Auswertung ansehen →') + '</button></div></div>';
      var box = $('qe-aufgabe');
      var render = RENDER[f.art] || RENDER.mc;
      render(f, box);
      if ($('qe-pruefen')) $('qe-pruefen').onclick = function () { pruefen(f); };
      if ($('qe-loesung')) $('qe-loesung').onclick = function () { aufdecken(f); };
      $('qe-next').onclick = weiter;
    }

    function pruefenFreigeben(ok) { var b = $('qe-pruefen'); if (b) b.disabled = !ok; }

    /* ── Renderer je Aufgabenart ── */
    var RENDER = {
      mc: function (f, box) {
        var liste = h('div', 'qe-optionen'); liste.id = 'qe-optionen';
        f.optionen.forEach(function (o, i) {
          var b = h('button', 'qe-opt', '<span class="qe-opt-buchstabe">' + BUCHSTABEN[i] + '</span><span>' + o.text + '</span>');
          b.type = 'button'; b.dataset.i = i;
          b.onclick = function () {
            if (beantwortet) return;
            if (f.mehrfach) {
              var p = auswahl.indexOf(i); if (p >= 0) auswahl.splice(p, 1); else auswahl.push(i);
              b.classList.toggle('qe-gewaehlt', p < 0); pruefenFreigeben(auswahl.length > 0);
            } else { auswahl = [i]; pruefen(f); }
          };
          liste.appendChild(b);
        });
        box.appendChild(liste);
      },
      luecken: function (f, box) {
        box.innerHTML = (f.teile || []).map(function (t, i) {
          return '<div class="qe-luecke-zeile"><div>' + t.text + '</div><input class="qe-eingabe" id="qe-t-' + i + '" type="text" autocomplete="off" placeholder="Begriff eingeben …" aria-label="Antwort ' + (i + 1) + '"><span class="qe-korrektur" id="qe-tk-' + i + '"></span></div>';
        }).join('');
        box.querySelectorAll('input').forEach(function (inp) {
          inp.addEventListener('input', function () { pruefenFreigeben(Array.prototype.some.call(box.querySelectorAll('input'), function (x) { return x.value.trim(); })); });
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !$('qe-pruefen').disabled) pruefen(f); });
        });
      },
      zuordnung: function (f, box) {
        var rechts = []; (f.paare || []).forEach(function (p) { if (rechts.indexOf(p.r) < 0) rechts.push(p.r); });
        rechts = shuffle(rechts);
        box.innerHTML = (f.paare || []).map(function (p, i) {
          return '<div class="qe-paar"><div class="qe-paar-links">' + p.l + '</div><select class="qe-luecke qe-paar-wahl" id="qe-z-' + i + '" aria-label="Zuordnung ' + (i + 1) + '"><option value="">…</option>'
            + rechts.map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join('') + '</select><span class="qe-korrektur" id="qe-zk-' + i + '"></span></div>';
        }).join('');
        box.querySelectorAll('select').forEach(function (s) { s.addEventListener('change', function () { pruefenFreigeben(Array.prototype.every.call(box.querySelectorAll('select'), function (x) { return x.value; })); }); });
      },
      sortierung: function (f, box) {
        zustand.reihe = [];
        var elemente = f.elemente || [];
        var bank = shuffle(elemente.map(function (t, i) { return { t: t, i: i }; }));
        box.innerHTML = '<p class="qe-modus-hinweis">Tippe die Elemente in der richtigen Reihenfolge an. Antippen in der Reihe entfernt wieder.</p>'
          + '<ol class="qe-reihe" id="qe-reihe" aria-label="Deine Reihenfolge"></ol><div class="qe-bank" id="qe-sortbank"></div>';
        function zeichnen() {
          var reihe = $('qe-reihe'), sb = $('qe-sortbank');
          reihe.innerHTML = ''; sb.innerHTML = '';
          zustand.reihe.forEach(function (e, pos) {
            var li = h('li', 'qe-reihe-el', '<span class="qe-reihe-nr">' + (pos + 1) + '.</span> ' + e.t);
            li.setAttribute('role', 'button'); li.tabIndex = 0;
            li.onclick = function () { if (beantwortet) return; zustand.reihe.splice(pos, 1); zeichnen(); };
            li.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); li.click(); } };
            reihe.appendChild(li);
          });
          bank.forEach(function (e) {
            if (zustand.reihe.indexOf(e) >= 0) return;
            var t = h('button', 'qe-tag', e.t); t.type = 'button';
            t.onclick = function () { if (beantwortet) return; zustand.reihe.push(e); zeichnen(); };
            sb.appendChild(t);
          });
          pruefenFreigeben(zustand.reihe.length === elemente.length);
        }
        zeichnen();
      },
      markierung: function (f, box) {
        zustand.markiert = [];
        var woerter = String(f.text || '').split(' ');
        box.innerHTML = '<p class="qe-modus-hinweis">Tippe die passenden Wörter an (nochmal antippen hebt die Markierung auf).</p><p class="qe-text qe-marktext" id="qe-marktext"></p>';
        var p = $('qe-marktext');
        woerter.forEach(function (w, i) {
          var s = h('span', 'qe-wort', esc(w)); s.setAttribute('role', 'button'); s.tabIndex = 0;
          s.onclick = function () {
            if (beantwortet) return;
            var pos = zustand.markiert.indexOf(i);
            if (pos >= 0) zustand.markiert.splice(pos, 1); else zustand.markiert.push(i);
            s.classList.toggle('qe-sel', pos < 0); pruefenFreigeben(zustand.markiert.length > 0);
          };
          s.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); s.click(); } };
          p.appendChild(s); p.appendChild(document.createTextNode(' '));
        });
      },
      einfaerben: function (f, box) {
        zustand.farbe = (f.kategorien || [])[0] ? f.kategorien[0].wert : null;
        zustand.wahl = (f.woerter || []).map(function () { return null; });
        box.innerHTML = '<p class="qe-modus-hinweis">Wähle zuerst eine Kategorie, dann tippe die Wörter im Satz an.</p><div class="qe-modi" id="qe-palette"></div><p class="qe-text qe-marktext" id="qe-satz"></p>';
        var pal = $('qe-palette');
        function paletteZeichnen() {
          pal.innerHTML = '';
          (f.kategorien || []).forEach(function (k) {
            var b = h('button', 'qe-modus' + (zustand.farbe === k.wert ? ' qe-aktiv' : ''), '<span class="qe-farbpunkt" style="background:' + esc(k.farbe || 'var(--qe-akzent)') + '"></span>' + esc(k.label || k.wert));
            b.type = 'button'; b.onclick = function () { zustand.farbe = k.wert; paletteZeichnen(); };
            pal.appendChild(b);
          });
          var x = h('button', 'qe-modus', '✕ Löschen'); x.type = 'button'; x.onclick = function () { zustand.farbe = null; paletteZeichnen(); }; pal.appendChild(x);
        }
        paletteZeichnen();
        var satz = $('qe-satz');
        (f.woerter || []).forEach(function (w, i) {
          var s = h('span', 'qe-wort', esc(w.t)); s.setAttribute('role', 'button'); s.tabIndex = 0;
          s.onclick = function () {
            if (beantwortet) return;
            zustand.wahl[i] = zustand.farbe;
            var k = (f.kategorien || []).filter(function (c) { return c.wert === zustand.farbe; })[0];
            s.style.background = k ? k.farbe : ''; s.style.color = k ? '#fff' : '';
            pruefenFreigeben(zustand.wahl.some(function (v) { return v; }));
          };
          s.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); s.click(); } };
          satz.appendChild(s); satz.appendChild(document.createTextNode(' '));
        });
      }
    };
    RENDER.rf = RENDER.mc;

    /* ── Bewertung je Aufgabenart: liefert {anteil 0..1, eigene, loesung} und markiert die Oberfläche ── */
    function vergleichbar(s) { return norm(s); }
    var BEWERTEN = {
      mc: function (f) {
        var btns = $('qe-optionen').querySelectorAll('.qe-opt');
        var ok = f.optionen.every(function (o, j) { return o.richtig === (auswahl.indexOf(j) >= 0); });
        f.optionen.forEach(function (o, j) {
          btns[j].disabled = true; btns[j].classList.remove('qe-gewaehlt');
          if (o.richtig) btns[j].classList.add('qe-richtig'); else if (auswahl.indexOf(j) >= 0) btns[j].classList.add('qe-falsch');
        });
        return { anteil: ok ? 1 : 0, eigene: auswahl.map(function (j) { return f.optionen[j].text; }).join(', ') || '–',
          loesung: f.optionen.filter(function (o) { return o.richtig; }).map(function (o) { return o.text; }).join(', ') };
      },
      luecken: function (f) {
        var n = f.teile.length, c = 0, eigene = [];
        f.teile.forEach(function (t, i) {
          var inp = $('qe-t-' + i), v = inp.value.trim(); inp.disabled = true; eigene.push(v || '–');
          var erwartet = String(t.antwort);
          var ok = vergleichbar(v) === vergleichbar(erwartet) || (v.length > 3 && vergleichbar(erwartet).indexOf(vergleichbar(v)) >= 0);
          inp.classList.add(ok ? 'qe-richtig' : 'qe-falsch');
          if (!ok) $('qe-tk-' + i).textContent = '→ ' + erwartet;
          if (ok) c++;
        });
        return { anteil: c / n, eigene: eigene.join(' · '), loesung: f.teile.map(function (t) { return t.antwort; }).join(' · ') };
      },
      zuordnung: function (f) {
        var n = f.paare.length, c = 0, eigene = [];
        f.paare.forEach(function (p, i) {
          var s = $('qe-z-' + i); s.disabled = true; eigene.push(s.value || '–');
          var ok = s.value === p.r;
          s.classList.add(ok ? 'qe-ok' : 'qe-fail');
          if (!ok) $('qe-zk-' + i).textContent = '→ ' + p.r;
          if (ok) c++;
        });
        return { anteil: c / n, eigene: eigene.join(' · '), loesung: f.paare.map(function (p) { return p.l + ' → ' + p.r; }).join(' · ') };
      },
      sortierung: function (f) {
        var reihe = zustand.reihe.map(function (e) { return e.t; });
        var ziele = [f.elemente].concat(f.akzeptiert || []);
        var voll = ziele.some(function (z) { return JSON.stringify(z) === JSON.stringify(reihe); });
        var treffer = 0; f.elemente.forEach(function (t, i) { if (reihe[i] === t) treffer++; });
        var items = $('qe-reihe').children;
        for (var i = 0; i < items.length; i++) items[i].classList.add(voll || reihe[i] === f.elemente[i] ? 'qe-ok' : 'qe-fail');
        return { anteil: voll ? 1 : treffer / f.elemente.length, eigene: reihe.join(' → '), loesung: f.elemente.join(' → ') };
      },
      markierung: function (f) {
        var woerter = String(f.text || '').split(' ');
        var zielWoerter = [];
        (f.ziele || []).forEach(function (z) { norm(z).split(' ').forEach(function (w) { if (w && zielWoerter.indexOf(w) < 0) zielWoerter.push(w); }); });
        var spans = $('qe-marktext').querySelectorAll('.qe-wort');
        var gefunden = 0, zielAnzahl = 0;
        woerter.forEach(function (w, i) {
          var clean = norm(w).replace(/[.,!?;:"„“”()]/g, '');
          var istZiel = !!clean && zielWoerter.indexOf(clean) >= 0;
          var gewaehlt = zustand.markiert.indexOf(i) >= 0;
          if (istZiel) zielAnzahl++;
          spans[i].classList.remove('qe-sel');
          if (istZiel && gewaehlt) { spans[i].classList.add('qe-ok'); gefunden++; }
          else if (!istZiel && gewaehlt) spans[i].classList.add('qe-fail');
          else if (istZiel) spans[i].classList.add('qe-fehlt');
        });
        var anteil = zielAnzahl ? gefunden / zielAnzahl : 0;
        if (gefunden === zielAnzahl && zustand.markiert.length > zielAnzahl) anteil = Math.max(0, (zielAnzahl - (zustand.markiert.length - zielAnzahl)) / zielAnzahl);
        return { anteil: anteil, eigene: zustand.markiert.length + ' Wörter markiert', loesung: (f.ziele || []).join(', ') };
      },
      einfaerben: function (f) {
        var spans = $('qe-satz').querySelectorAll('.qe-wort'), c = 0;
        f.woerter.forEach(function (w, i) {
          var ok = zustand.wahl[i] === w.k;
          spans[i].classList.add(ok ? 'qe-ok' : 'qe-fail');
          if (!ok) { var k = f.kategorien.filter(function (x) { return x.wert === w.k; })[0]; spans[i].title = 'Richtig: ' + (k ? k.label : w.k); }
          if (ok) c++;
        });
        return { anteil: c / f.woerter.length, eigene: c + ' von ' + f.woerter.length + ' richtig',
          loesung: f.woerter.map(function (w) { var k = f.kategorien.filter(function (x) { return x.wert === w.k; })[0]; return w.t + ' = ' + (k ? k.label : w.k); }).join(' · ') };
      }
    };
    BEWERTEN.rf = BEWERTEN.mc;

    function abschliessen(f, erg, hilfe) {
      beantwortet = true;
      var anteil = hilfe ? 0 : erg.anteil;
      if (!TEILPUNKTE && anteil < 1) anteil = 0;
      var erreicht = Math.round(anteil * f.gewicht * 100) / 100;
      punkte += erreicht;
      verlauf.push({ frage: f.frage, ok: anteil >= 1, teil: anteil > 0 && anteil < 1, hilfe: hilfe, eigene: erg.eigene, richtig: erg.loesung, gewicht: f.gewicht, erreicht: erreicht, gruppe: daten.auswertungNach ? f[daten.auswertungNach] : null });
      if ($('qe-pruefen')) $('qe-pruefen').disabled = true;
      if ($('qe-loesung')) $('qe-loesung').disabled = true;
      $('qe-chip').textContent = zahl(punkte) + ' Punkte';
      var fb = $('qe-feedback');
      fb.className = 'qe-feedback ' + (hilfe ? 'qe-teil' : anteil >= 1 ? 'qe-ok' : anteil > 0 ? 'qe-teil' : 'qe-no');
      fb.innerHTML = '<strong>' + (hilfe ? 'Lösung angezeigt – diese Aufgabe zählt nicht.' : anteil >= 1 ? 'Richtig!' : anteil > 0 ? 'Teilweise richtig (' + zahl(erreicht) + ' von ' + f.gewicht + ').' : 'Leider falsch.') + '</strong> '
        + (anteil < 1 && (hilfe || f.art !== 'mc' && f.art !== 'rf') ? 'Lösung: ' + esc(erg.loesung) + '. ' : '') + (f.erklaerung || '');
      $('qe-weiter').style.display = 'block';
      $('qe-next').focus();
    }

    function pruefen(f) {
      if (beantwortet) return;
      abschliessen(f, BEWERTEN[f.art](f), false);
    }

    function aufdecken(f) {
      if (beantwortet) return;
      auswahl = []; zustand.reihe = zustand.reihe || []; zustand.markiert = zustand.markiert || []; zustand.wahl = zustand.wahl || [];
      abschliessen(f, BEWERTEN[f.art](f), true);
    }

    function weiter() {
      if (!beantwortet) return;
      cur++;
      if (cur >= pool.length) ergebnis(); else frageZeigen();
    }

    function ergebnis() {
      inhalt.innerHTML = '';
      var extra = '';
      if (daten.auswertungNach) {
        var gruppen = {}, reihenfolge = [];
        verlauf.forEach(function (v) { var g = v.gruppe == null ? '–' : String(v.gruppe); if (!gruppen[g]) { gruppen[g] = { e: 0, m: 0 }; reihenfolge.push(g); } gruppen[g].e += v.erreicht; gruppen[g].m += v.gewicht; });
        var labels = daten.auswertungLabels || {};
        extra = '<div class="qe-details" style="margin-top:1rem"><p class="qe-konfig-label">Ergebnis nach ' + esc(daten.auswertungTitel || daten.auswertungNach) + '</p>'
          + reihenfolge.map(function (g) { var x = gruppen[g]; var p = x.m ? Math.round(x.e / x.m * 100) : 0; return '<div class="qe-detail"><span style="min-width:9rem">' + esc(labels[g] || g) + '</span><span class="qe-detail-antwort">' + zahl(x.e) + ' / ' + zahl(x.m) + ' (' + p + ' %)</span></div>'; }).join('') + '</div>';
      }
      var details = '<div class="qe-karte qe-details" style="text-align:left;margin-top:1.25rem"><h2>Auswertung im Detail</h2>'
        + verlauf.map(function (v) {
            return '<div class="qe-detail"><span class="qe-detail-icon">' + (v.ok ? '✓' : v.hilfe ? '👁' : v.teil ? '◐' : '✗') + '</span>'
              + '<div><div>' + v.frage + '</div><div class="qe-detail-antwort">'
              + (v.ok ? 'Richtig: ' + esc(v.richtig) : (v.hilfe ? 'Lösung angesehen' : 'Deine Antwort: ' + esc(v.eigene)) + ' · Richtig: ' + esc(v.richtig))
              + (v.gewicht !== 1 ? ' · ' + zahl(v.erreicht) + '/' + v.gewicht + ' Punkte' : '')
              + '</div></div></div>';
          }).join('') + '</div>';
      auswerten(punkte, extra);
      $('qe-ergebnis').insertAdjacentHTML('beforeend', details);
    }

    return { start: start, gesamt: gesamt, aktuell: aktuell, modus: modus, pool: function () { return pool; }, index: function () { return cur; } };
  }

  /* ======================================================================
     TYP 2: BILDERRATEN / REBUS
     bilder: "/img/quiz/<quiz>/" (Basis-Pfad), fragen: [{bild, antwort, alternativen, frage, tipp, bonus, notiz, info:{zeilen:[[label,wert]], wissenswertes:[…]}}]
     Optionen: mischen (Standard true), versuche (1–6, Standard 1), toleranz (Levenshtein, Standard 3; 0 = aus),
               toleranzVoll (Tippfehler, die noch volle Punkte geben), teilantworten (Nachname reicht), anzahl,
               treffer: "stichwort" (Schlüsselwort muss in der Antwort vorkommen – antwort + alternativen),
               tipps: ["…","…"] je Frage (gestaffelt, kostenlos) · tipp: "…" (halbiert die Punkte)
               abschluss: {titel, hinweis, frage, antwort, alternativen, treffer, gewicht, erklaerung} – Bonusfrage mit Galerie
     Punkte je Frage: 1 (exakt) · ½ (fast richtig) · 0 (falsch); jeder Fehlversuch/Tipp halbiert den Faktor
     ====================================================================== */
  function TypBilder() {
    var fragen = [], cur = 0, punkte = 0, stats, faktor, beantwortet, versuche, inhalt;
    var MAX_VERSUCHE = Math.max(1, Math.min(6, daten.versuche || 1));
    var TOLERANZ = daten.toleranz === undefined ? 3 : daten.toleranz;
    var TOLERANZ_VOLL = daten.toleranzVoll || 0;      /* Tippfehler, die noch als „exakt“ zählen (Lehrer-Rebus: 2) */
    var ABSCHLUSS = daten.abschluss || null;          /* optionale Bonusfrage nach dem letzten Bild */
    var abschlussPunkte = 0, abschlussErg = null;

    function gesamt() { return (fragen.length || (daten.fragen || []).length) + (ABSCHLUSS ? (ABSCHLUSS.gewicht || 1) : 0); }
    function aktuell() { return punkte + abschlussPunkte; }

    function bildPfad(f) {
      if (!f.bild) return '';
      if (/^(https?:)?\//.test(f.bild) || /^data:/.test(f.bild)) return f.bild;
      return (daten.bilder || '') + f.bild;
    }

    function start() {
      inhalt = $('qe-inhalt');
      var basis = (daten.fragen || []).map(function (f, i) { f.nr = i; return f; });
      if (daten.mischen !== false) basis = shuffle(basis);
      if (daten.anzahl && daten.anzahl < basis.length) basis = basis.slice(0, daten.anzahl);
      fragen = basis; cur = 0; punkte = 0; abschlussPunkte = 0; abschlussErg = null; stats = { exakt: 0, fast: 0, falsch: 0 };
      kopfChip();
      frageZeigen();
    }

    function kopfChip() {
      $('qe-kopf-extra').innerHTML = '<div class="qe-punkte">🎯 Punkte: <span id="qe-punkte">' + zahl(punkte) + '</span> / ' + gesamt() + '</div>';
    }

    function frageZeigen() {
      var f = fragen[cur];
      beantwortet = false; versuche = 0; faktor = 1;
      inhalt.innerHTML = '<div class="qe-karte">'
        + '<div class="qe-bild-wrap"><img class="qe-bild" id="qe-bild" alt="Quiz-Bild"><div class="qe-badge">' + (f.bonus ? '⭐ Bonus · ' : '') + 'Frage ' + (cur + 1) + ' / ' + fragen.length + '</div></div>'
        + '<p class="qe-frage" style="text-align:center;font-size:1rem">' + esc(f.frage || daten.frage || 'Wer oder was ist hier zu sehen?') + '</p>'
        + (f.notiz ? '<p class="qe-notiz">✨ ' + esc(f.notiz) + '</p>' : '')
        + '<div class="qe-eingabe-zeile"><input class="qe-eingabe" id="qe-antwort" type="text" placeholder="Deine Antwort …" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Antwort">'
        + '<button type="button" class="qe-btn qe-btn-primaer" id="qe-pruefen">Prüfen</button></div>'
        + '<div class="qe-tipp" id="qe-tipp"></div>'
        + (Array.isArray(f.tipps) && f.tipps.length ? '<div class="qe-tipps" id="qe-tipps">' + f.tipps.map(function (t, i) {
            return t ? '<button type="button" class="qe-btn qe-btn-sekundaer qe-btn-klein qe-tipp-stufe" data-i="' + i + '">💡 Tipp ' + (i + 1) + '</button>' : '';
          }).join('') + '</div>' : '')
        + '<div class="qe-hilfe">'
        + (f.tipp ? '<button type="button" class="qe-btn qe-btn-sekundaer qe-btn-klein" id="qe-tipp-btn">💡 Tipp (halbe Punkte)</button>' : '')
        + (daten.loesungErlaubt !== false ? '<button type="button" class="qe-btn qe-btn-sekundaer qe-btn-klein" id="qe-loesung">Lösung zeigen</button>' : '')
        + '</div>'
        + '<div class="qe-feedback" id="qe-feedback"></div>'
        + '<div class="qe-weiter" id="qe-weiter"><button type="button" class="qe-btn qe-btn-primaer" id="qe-next">'
        + (cur + 1 < fragen.length ? 'Weiter →' : 'Auswertung ansehen →') + '</button></div></div>';
      $('qe-bild').src = bildPfad(f);
      $('qe-pruefen').onclick = pruefen;
      $('qe-next').onclick = weiter;
      if ($('qe-tipp-btn')) $('qe-tipp-btn').onclick = function () {
        $('qe-tipp').textContent = '💡 ' + f.tipp; $('qe-tipp').classList.add('qe-offen');
        faktor /= 2; this.disabled = true;
      };
      if ($('qe-loesung')) $('qe-loesung').onclick = aufdecken;
      if ($('qe-tipps')) $('qe-tipps').querySelectorAll('.qe-tipp-stufe').forEach(function (b) {
        b.onclick = function () {
          var t = $('qe-tipp'); t.classList.add('qe-offen');
          var z = h('div', '', '💡 <strong>Tipp ' + (Number(b.dataset.i) + 1) + ':</strong> ' + esc(f.tipps[b.dataset.i])); t.appendChild(z);
          b.disabled = true;
        };
      });
      var inp = $('qe-antwort');
      inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        if (!beantwortet) pruefen(); else weiter();
      });
      inp.focus();
    }

    /* Stichwort-Treffer (z. B. Monatsnamen-Rebus): ein Schlüsselwort kommt in der Eingabe vor,
       oder ein Eingabewort weicht nur leicht davon ab (≥ 5 Zeichen: 1 Fehler, ≥ 9 Zeichen: 2) */
    function stichwortTreffer(n, f) {
      var woerter = n.split(' ');
      return [f.antwort].concat(f.alternativen || []).map(norm).some(function (kw) {
        if (!kw) return false;
        if (n.indexOf(kw) >= 0) return true;
        var max = kw.length >= 9 ? 2 : kw.length >= 5 ? 1 : 0;
        return max > 0 && woerter.some(function (w) { return levenshtein(w, kw) <= max; });
      });
    }

    function stufe(eingabe, f) {
      var n = norm(eingabe);
      if (!n) return 0;
      if ((f.treffer || daten.treffer) === 'stichwort') return stichwortTreffer(n, f) ? 1 : 0;
      var kandidaten = [f.antwort].concat(f.alternativen || []).map(norm);
      if (kandidaten.indexOf(n) >= 0) return 1;
      if (TOLERANZ_VOLL > 0) {
        for (var v = 0; v < kandidaten.length; v++) if (levenshtein(n, kandidaten[v]) <= TOLERANZ_VOLL) return 1;
      }
      if (TOLERANZ > 0) {
        for (var i = 0; i < kandidaten.length; i++) if (levenshtein(n, kandidaten[i]) <= TOLERANZ) return 0.5;
        if (daten.teilantworten) {
          var teile = norm(f.antwort).split(' ');
          for (var t = 0; t < teile.length; t++) if (teile[t].length >= 4 && levenshtein(n, teile[t]) <= 2) return 0.5;
        }
      }
      return 0;
    }

    function infoHTML(f) {
      var info = f.info || {};
      var html = '';
      if (Array.isArray(info.zeilen) && info.zeilen.length) {
        html += '<div class="qe-info">' + info.zeilen.map(function (z) {
          return '<span class="qe-info-label">' + esc(z[0]) + '</span><span>' + esc(z[1]) + '</span>';
        }).join('') + '</div>';
      }
      if (Array.isArray(info.wissenswertes) && info.wissenswertes.length) {
        html += '<ul class="qe-wissen">' + info.wissenswertes.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
      }
      if (info.text) html += '<div class="qe-wissen" style="margin-top:.6rem">' + info.text + '</div>';
      return html;
    }

    function abschliessen(f, erreicht, klasse, kopf) {
      beantwortet = true;
      punkte += erreicht;
      $('qe-punkte').textContent = zahl(punkte);
      var inp = $('qe-antwort');
      inp.disabled = true; inp.className = 'qe-eingabe ' + klasse;
      $('qe-pruefen').disabled = true;
      if ($('qe-tipp-btn')) $('qe-tipp-btn').disabled = true;
      if ($('qe-loesung')) $('qe-loesung').disabled = true;
      var fb = $('qe-feedback');
      fb.className = 'qe-feedback ' + (klasse === 'qe-richtig' ? 'qe-ok' : klasse === 'qe-teil' ? 'qe-teil' : 'qe-no');
      fb.innerHTML = '<div class="qe-feedback-kopf">' + kopf + (f.bonus ? ' (Bonus)' : '')
        + (erreicht < 1 ? ' — Richtig: <strong>' + esc(f.antwort) + '</strong>' : '') + '</div>' + infoHTML(f);
      $('qe-weiter').style.display = 'block';
      $('qe-next').focus();
    }

    function pruefen() {
      if (beantwortet) return;
      var f = fragen[cur];
      var roh = $('qe-antwort').value.trim();
      if (!roh) return;
      var s = stufe(roh, f);
      if (s === 1) { stats.exakt++; abschliessen(f, faktor, 'qe-richtig', '✅ Exakt richtig! +' + zahl(faktor)); return; }
      if (s === 0.5) { stats.fast++; abschliessen(f, faktor / 2, 'qe-teil', '⚡ Fast richtig! +' + zahl(faktor / 2)); return; }
      versuche++;
      if (versuche < MAX_VERSUCHE) {
        faktor /= 2;
        var fb = $('qe-feedback');
        fb.className = 'qe-feedback qe-no';
        fb.innerHTML = '<strong>Leider falsch.</strong> Noch ' + (MAX_VERSUCHE - versuche) + ' Versuch' + (MAX_VERSUCHE - versuche === 1 ? '' : 'e')
          + ' – jetzt noch max. ' + zahl(faktor) + ' Punkte.';
        $('qe-antwort').className = 'qe-eingabe qe-falsch';
        $('qe-antwort').select();
        return;
      }
      stats.falsch++;
      abschliessen(f, 0, 'qe-falsch', '❌ Leider falsch – 0 Punkte');
    }

    /* wie bei MC: nur diese Frage zählt 0 */
    function aufdecken() {
      if (beantwortet) return;
      stats.falsch++;
      abschliessen(fragen[cur], 0, 'qe-falsch', '👁 Lösung angezeigt – 0 Punkte');
    }

    function weiter() {
      if (!beantwortet) return;
      cur++;
      if (cur >= fragen.length) { if (ABSCHLUSS && !abschlussErg) abschlussZeigen(); else ergebnis(); }
      else frageZeigen();
    }

    /* Abschluss-/Bonusfrage: alle Bilder als Galerie, dazu eine freie Frage (z. B. „Was verbindet alle Bilder?“) */
    function abschlussZeigen() {
      var fr = { antwort: ABSCHLUSS.antwort, alternativen: ABSCHLUSS.alternativen || [], treffer: ABSCHLUSS.treffer };
      inhalt.innerHTML = '<div class="qe-karte">'
        + '<h2>' + esc(ABSCHLUSS.titel || '⭐ Abschlussfrage') + '</h2>'
        + (ABSCHLUSS.hinweis ? '<p class="qe-modus-hinweis">' + esc(ABSCHLUSS.hinweis) + '</p>' : '')
        + '<div class="qe-galerie">' + fragen.map(function (f) {
            return '<figure><img src="' + esc(bildPfad(f)) + '" alt="" loading="lazy"><figcaption>' + esc(f.antwort) + '</figcaption></figure>';
          }).join('') + '</div>'
        + '<p class="qe-frage" style="text-align:center;font-size:1.05rem">' + esc(ABSCHLUSS.frage) + '</p>'
        + '<div class="qe-eingabe-zeile"><input class="qe-eingabe" id="qe-abschluss" type="text" placeholder="Deine Antwort …" autocomplete="off" aria-label="Antwort auf die Abschlussfrage">'
        + '<button type="button" class="qe-btn qe-btn-primaer" id="qe-abschluss-pruefen">Prüfen</button></div>'
        + '<div class="qe-feedback" id="qe-feedback"></div>'
        + '<div class="qe-weiter" id="qe-weiter"><button type="button" class="qe-btn qe-btn-primaer" id="qe-next">Auswertung ansehen →</button></div></div>';
      var pruefenA = function () {
        if (abschlussErg) return;
        var roh = $('qe-abschluss').value.trim(); if (!roh) return;
        var ok = stufe(roh, fr) === 1;
        abschlussErg = { ok: ok, eigene: roh };
        abschlussPunkte = ok ? (ABSCHLUSS.gewicht || 1) : 0;
        $('qe-punkte').textContent = zahl(punkte + abschlussPunkte);
        $('qe-abschluss').disabled = true; $('qe-abschluss-pruefen').disabled = true;
        $('qe-abschluss').className = 'qe-eingabe ' + (ok ? 'qe-richtig' : 'qe-falsch');
        var fb = $('qe-feedback'); fb.className = 'qe-feedback ' + (ok ? 'qe-ok' : 'qe-no');
        fb.innerHTML = '<div class="qe-feedback-kopf">' + (ok ? '✅ Richtig! +' + (ABSCHLUSS.gewicht || 1) : '❌ Leider falsch') + ' — Lösung: <strong>' + esc(ABSCHLUSS.antwort) + '</strong></div>' + (ABSCHLUSS.erklaerung || '');
        $('qe-weiter').style.display = 'block';
      };
      $('qe-abschluss-pruefen').onclick = pruefenA;
      $('qe-abschluss').addEventListener('keydown', function (e) { if (e.key === 'Enter') { if (!abschlussErg) pruefenA(); else ergebnis(); } });
      $('qe-next').onclick = ergebnis;
      $('qe-abschluss').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function ergebnis() {
      inhalt.innerHTML = '';
      var extra = (ABSCHLUSS ? '<p class="qe-ergebnis-text">' + (abschlussErg ? (abschlussErg.ok ? '⭐ Abschlussfrage richtig: +' + (ABSCHLUSS.gewicht || 1) : '⭐ Abschlussfrage: leider falsch (Lösung: ' + esc(ABSCHLUSS.antwort) + ')') : '⭐ Abschlussfrage nicht beantwortet') + '</p>' : '')
        + '<div class="qe-statistik">'
        + '<div><div class="qe-stat-zahl g">' + stats.exakt + '</div><div class="qe-stat-label">Exakt richtig</div></div>'
        + '<div><div class="qe-stat-zahl o">' + stats.fast + '</div><div class="qe-stat-label">Fast richtig</div></div>'
        + '<div><div class="qe-stat-zahl r">' + stats.falsch + '</div><div class="qe-stat-label">Falsch</div></div></div>';
      auswerten(punkte + abschlussPunkte, extra);
    }

    return { start: start, gesamt: gesamt, aktuell: aktuell };
  }

  /* ======================================================================
     TYP 3: STUMME KARTE MIT HOTSPOTS
     karte: {stumm, loesung?}, fragen: [{antwort, x, y, alternativen?, gruppe?}] (x/y in Prozent)
     modi: ["leicht","mittel","schwer"] – leicht = 4 Auswahloptionen, mittel = Begriffe zuordnen, schwer = freie Eingabe
     gruppen: {"bl": {name, farbe}, …} – optional; Auswahloptionen kommen nur aus derselben Gruppe, Punkte/Tags tragen die Gruppenfarbe
     ====================================================================== */
  function TypKarte() {
    var HS = [], state = {}, modus, popup = null, drag = null, gewaehltTag = null, zeigeLoesung = false, inhalt;
    var MODI = daten.modi || ['leicht', 'mittel', 'schwer'];
    var HINWEIS = { leicht: '4 Auswahloptionen · Sofort-Feedback', mittel: 'Begriffe per Drag & Drop (oder Antippen) zuordnen · Auswertung auf Knopfdruck', schwer: 'Freie Eingabe · Auswertung auf Knopfdruck' };
    var NAME = { leicht: '🟢 Leicht', mittel: '🟡 Mittel', schwer: '🔴 Schwer' };

    function gesamt() { return (daten.fragen || []).length; }
    function richtig(hs, antwort) {
      var n = norm(antwort);
      return !!n && [hs.antwort].concat(hs.alternativen || []).some(function (a) { return norm(a) === n; });
    }
    function aktuell() {
      var c = 0;
      HS.forEach(function (hs) { if (richtig(hs, state[hs.id].antwort)) c++; });
      return c;
    }

    function start() {
      inhalt = $('qe-inhalt');
      HS = (daten.fragen || []).map(function (f, i) { return { id: i, antwort: f.antwort, alternativen: f.alternativen || [], x: f.x, y: f.y, gruppe: f.gruppe || '' }; });
      modus = modus || MODI[0];
      inhalt.innerHTML = '<div class="qe-karte">' + (introHTML() ? '<div class="qe-intro" style="margin-bottom:1rem">' + introHTML() + '</div>' : '')
        + (MODI.length > 1 ? '<div class="qe-modi" id="qe-modi"></div>' : '')
        + '<p class="qe-modus-hinweis" id="qe-modus-hinweis"></p>'
        + '<div class="qe-map" id="qe-map"><img id="qe-mapimg" alt="Stumme Karte"></div>'
        + '<div id="qe-bank-wrap"></div>'
        + '<div class="qe-fortschritt" id="qe-prog" style="display:none;margin-top:.75rem"><span id="qe-prog-text"></span><div class="qe-balken"><div class="qe-balken-f" id="qe-pbar" style="width:0%"></div></div></div>'
        + '<div class="qe-aktionen" style="justify-content:space-between">'
        + '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="qe-btn qe-btn-primaer" id="qe-auswerten" style="display:none">Auswerten</button>'
        + '<button type="button" class="qe-btn qe-btn-sekundaer" id="qe-neu">Zurücksetzen</button></div>'
        + (daten.loesungErlaubt !== false ? '<button type="button" class="qe-btn qe-btn-sekundaer" id="qe-loesung">Lösung zeigen</button>' : '')
        + '</div></div>';
      if ($('qe-modi')) MODI.forEach(function (m) {
        var b = h('button', 'qe-modus' + (m === modus ? ' qe-aktiv' : ''), NAME[m] || m);
        b.type = 'button'; b.onclick = function () { modus = m; gesperrt = null; gemeldet = false; start(); };
        $('qe-modi').appendChild(b);
      });
      $('qe-modus-hinweis').textContent = HINWEIS[modus] || '';
      if (daten.gruppen) {
        var leg = h('p', 'qe-modus-hinweis');
        leg.innerHTML = Object.keys(daten.gruppen).map(function (g) {
          return '<span class="qe-legende" style="--qe-g:' + esc(daten.gruppen[g].farbe || 'var(--qe-akzent)') + '">' + esc(daten.gruppen[g].name || g) + '</span>';
        }).join(' ');
        $('qe-modus-hinweis').parentNode.insertBefore(leg, $('qe-modus-hinweis').nextSibling);
      }
      $('qe-mapimg').src = daten.karte.stumm;
      $('qe-neu').onclick = neustart;
      $('qe-auswerten').onclick = auswertenAlle;
      if ($('qe-loesung')) $('qe-loesung').onclick = toggleLoesung;
      $('qe-ergebnis').style.display = 'none';
      zeigeLoesung = false; popup = null; drag = null; gewaehltTag = null;
      state = {}; HS.forEach(function (hs) { state[hs.id] = { antwort: '', fertig: false }; });
      aufbauen();
    }

    function farbe(hs) { return daten.gruppen && daten.gruppen[hs.gruppe] && daten.gruppen[hs.gruppe].farbe || ''; }
    function pool(hs) { return HS.filter(function (o) { return o.gruppe === hs.gruppe; }).map(function (o) { return o.antwort; }); }

    function aufbauen() {
      var w = $('qe-map');
      w.querySelectorAll('.qe-dot,.qe-popup,.qe-dz,.qe-hz,.qe-loesung-label').forEach(function (e) { e.remove(); });
      $('qe-bank-wrap').innerHTML = '';
      var alle = HS.map(function (hs) { return hs.antwort; });
      var farbeVon = {}; HS.forEach(function (hs) { farbeVon[hs.antwort] = farbe(hs); });
      $('qe-auswerten').style.display = modus === 'leicht' ? 'none' : '';

      if (modus === 'mittel') {
        var bank = h('div', 'qe-bank'); bank.id = 'qe-bank';
        shuffle(alle).forEach(function (lbl) {
          var t = h('div', 'qe-tag', esc(lbl)); t.draggable = true; t.dataset.label = lbl;
          if (farbeVon[lbl]) t.style.borderColor = farbeVon[lbl];
          t.addEventListener('dragstart', function (e) { drag = lbl; e.dataTransfer.effectAllowed = 'move'; });
          t.addEventListener('click', function () {
            gewaehltTag = gewaehltTag === lbl ? null : lbl;
            bank.querySelectorAll('.qe-tag').forEach(function (x) { x.classList.toggle('qe-gewaehlt', x.dataset.label === gewaehltTag); });
          });
          bank.appendChild(t);
        });
        $('qe-bank-wrap').appendChild(bank);
      }

      HS.forEach(function (hs) {
        if (modus === 'leicht') {
          var d = h('div', 'qe-dot'); d.id = 'qe-dot-' + hs.id; d.setAttribute('role', 'button'); d.tabIndex = 0;
          d.setAttribute('aria-label', 'Ort ' + (hs.id + 1));
          d.style.left = hs.x + '%'; d.style.top = hs.y + '%';
          if (farbe(hs)) d.style.background = farbe(hs);
          d.onclick = function (e) { e.stopPropagation(); if (!state[hs.id].fertig && !zeigeLoesung) popupOeffnen(hs, d, pool(hs)); };
          d.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.click(); } };
          w.appendChild(d);
        } else if (modus === 'mittel') {
          var dz = h('div', 'qe-dz'); dz.style.left = hs.x + '%'; dz.style.top = hs.y + '%';
          var lbl = h('div', 'qe-dz-lbl', '?'); lbl.id = 'qe-dz-' + hs.id;
          if (farbe(hs)) lbl.style.borderColor = farbe(hs);
          dz.appendChild(lbl);
          var ablegen = function (wert) {
            if (!wert) return;
            var vorher = state[hs.id].antwort;
            if (vorher) { var ot = document.querySelector('#qe-bank .qe-tag[data-label="' + vorher.replace(/"/g, '\\"') + '"]'); if (ot) ot.classList.remove('qe-benutzt'); }
            /* gleicher Begriff woanders? → dort entfernen */
            HS.forEach(function (o) {
              if (o.id !== hs.id && state[o.id].antwort === wert) { state[o.id].antwort = ''; var l = $('qe-dz-' + o.id); l.textContent = '?'; l.className = 'qe-dz-lbl'; }
            });
            state[hs.id].antwort = wert; lbl.textContent = wert; lbl.className = 'qe-dz-lbl qe-gefuellt';
            var ut = document.querySelector('#qe-bank .qe-tag[data-label="' + wert.replace(/"/g, '\\"') + '"]'); if (ut) { ut.classList.add('qe-benutzt'); ut.classList.remove('qe-gewaehlt'); }
            drag = null; gewaehltTag = null;
          };
          dz.addEventListener('dragover', function (e) { e.preventDefault(); });
          dz.addEventListener('drop', function (e) { e.preventDefault(); ablegen(drag); });
          lbl.addEventListener('click', function () {
            if (zeigeLoesung) return;
            if (gewaehltTag) ablegen(gewaehltTag);
            else if (state[hs.id].antwort) { /* abnehmen */
              var ot = document.querySelector('#qe-bank .qe-tag[data-label="' + state[hs.id].antwort.replace(/"/g, '\\"') + '"]'); if (ot) ot.classList.remove('qe-benutzt');
              state[hs.id].antwort = ''; lbl.textContent = '?'; lbl.className = 'qe-dz-lbl';
            }
          });
          w.appendChild(dz);
        } else {
          var hz = h('div', 'qe-hz'); hz.style.left = hs.x + '%'; hz.style.top = hs.y + '%';
          var inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = '?'; inp.autocomplete = 'off'; inp.id = 'qe-hi-' + hs.id;
          if (farbe(hs)) inp.style.borderColor = farbe(hs);
          inp.setAttribute('aria-label', 'Ort ' + (hs.id + 1));
          inp.addEventListener('input', function () { state[hs.id].antwort = inp.value.trim(); });
          hz.appendChild(inp); w.appendChild(hz);
        }
      });
      w.onclick = function () { if (popup) { popup.remove(); popup = null; } };
    }

    function optionen(korrekt, alle) {
      var andere = shuffle(alle.filter(function (l) { return l !== korrekt; }));
      return shuffle([korrekt].concat(andere.slice(0, 3)));
    }

    function popupOeffnen(hs, dot, alle) {
      if (popup) { popup.remove(); popup = null; }
      var o = optionen(hs.antwort, alle);
      var p = h('div', 'qe-popup'); var liste = h('div', 'qe-popup-opts');
      o.forEach(function (opt) {
        var b = h('button', 'qe-pop-btn', esc(opt)); b.type = 'button';
        b.onclick = function (e) {
          e.stopPropagation();
          var ok = opt === hs.antwort;
          b.className = 'qe-pop-btn ' + (ok ? 'qe-ok' : 'qe-fail');
          if (!ok) liste.querySelectorAll('.qe-pop-btn').forEach(function (x) { if (x.textContent === hs.antwort) x.className = 'qe-pop-btn qe-ok'; });
          dot.className = 'qe-dot ' + (ok ? 'qe-ok' : 'qe-fail'); dot.style.background = '';
          state[hs.id].fertig = true; state[hs.id].antwort = opt;
          liste.querySelectorAll('.qe-pop-btn').forEach(function (x) { x.disabled = true; });
          fortschritt();
          /* Popup nach kurzem Feedback schließen, sonst verdeckt es Nachbar-Punkte */
          setTimeout(function () { if (popup === p) { p.remove(); popup = null; } }, 700);
        };
        liste.appendChild(b);
      });
      p.appendChild(liste);
      dot.parentNode.appendChild(p);
      p.style.left = (parseFloat(hs.x) > 65 ? 'calc(' + hs.x + '% - 215px)' : 'calc(' + hs.x + '% + 14px)');
      p.style.top = (parseFloat(hs.y) > 75 ? 'calc(' + hs.y + '% - 140px)' : 'calc(' + hs.y + '% - 8px)');
      popup = p;
    }

    function fortschritt() {
      var fertig = 0, c = 0;
      HS.forEach(function (hs) { if (state[hs.id].fertig) { fertig++; if (richtig(hs, state[hs.id].antwort)) c++; } });
      var pg = $('qe-prog'); pg.style.display = 'flex';
      $('qe-pbar').style.width = (fertig / HS.length * 100) + '%';
      $('qe-prog-text').textContent = c + ' / ' + fertig + ' richtig (' + HS.length + ' gesamt)';
      if (fertig === HS.length) fertigMelden(c);
    }

    function auswertenAlle() {
      var c = 0;
      HS.forEach(function (hs) {
        var ok = richtig(hs, state[hs.id].antwort);
        state[hs.id].fertig = true;
        if (modus === 'mittel') { var el = $('qe-dz-' + hs.id); if (el) el.className = 'qe-dz-lbl qe-gefuellt ' + (ok ? 'qe-ok' : 'qe-fail'); if (!ok) el.title = 'Richtig: ' + hs.antwort; }
        else { var ip = $('qe-hi-' + hs.id); if (ip) { ip.className = ok ? 'qe-ok' : 'qe-fail'; ip.disabled = true; if (!ok) ip.title = 'Richtig: ' + hs.antwort; } }
        if (ok) c++;
      });
      $('qe-auswerten').disabled = true;
      fertigMelden(c);
    }

    function fertigMelden(c) {
      var falsch = HS.filter(function (hs) { return !richtig(hs, state[hs.id].antwort); });
      var extra = falsch.length
        ? '<div class="qe-details" style="margin-top:1rem;font-size:.9rem"><strong>Noch zu üben:</strong> ' + falsch.map(function (hs) { return esc(hs.antwort); }).join(' · ') + '</div>'
        : '';
      auswerten(c, extra);
    }

    function loesungAnzeigen(an) {
      var w = $('qe-map');
      if (daten.karte.loesung) $('qe-mapimg').src = an ? daten.karte.loesung : daten.karte.stumm;
      w.querySelectorAll('.qe-dot,.qe-dz,.qe-hz').forEach(function (e) { e.style.display = an ? 'none' : ''; });
      w.querySelectorAll('.qe-loesung-label').forEach(function (e) { e.remove(); });
      if (an && !daten.karte.loesung) {
        HS.forEach(function (hs) {
          var l = h('div', 'qe-loesung-label', esc(hs.antwort)); l.style.left = hs.x + '%'; l.style.top = hs.y + '%'; w.appendChild(l);
        });
      }
      if (an && popup) { popup.remove(); popup = null; }
    }

    function toggleLoesung() {
      zeigeLoesung = !zeigeLoesung;
      if (zeigeLoesung) loesungAufgedeckt();
      loesungAnzeigen(zeigeLoesung);
      $('qe-loesung').textContent = zeigeLoesung ? '↩ Meine Antworten zeigen' : 'Lösung zeigen';
    }

    return { start: start, gesamt: gesamt, aktuell: aktuell };
  }

  /* ======================================================================
     TYP 4: LÜCKENTEXT
     fragen: [{titel?, text}] oder text: "…"  –  Lücken: [antwort|alternative] (Eingabe), {richtig|falsch|falsch} (Auswahl)
     Optionen: genau (Standard true = Groß-/Kleinschreibung zählt), optionenMischen (Standard true)
     ====================================================================== */
  function TypLueckentext() {
    var luecken = [], zeigeLoesung = false, ausgewertet = false, inhalt;
    var GENAU = daten.genau !== false;
    var RE = /\[([^\]]+)\]|\{([^}]+)\}/g;

    function abschnitte() {
      if (Array.isArray(daten.fragen)) return daten.fragen;
      return [{ text: daten.text || '' }];
    }
    function gesamt() {
      var n = 0;
      abschnitte().forEach(function (a) { var m = String(a.text || '').match(RE); n += m ? m.length : 0; });
      return n;
    }
    function vergleich(s) { return GENAU ? String(s).trim().replace(/\s+/g, ' ') : norm(s); }
    function istRichtig(l) { return l.akzeptiert.indexOf(vergleich(l.el.value)) >= 0; }
    function aktuell() { var c = 0; luecken.forEach(function (l) { if (istRichtig(l)) c++; }); return c; }

    function start() {
      inhalt = $('qe-inhalt');
      luecken = []; zeigeLoesung = false; ausgewertet = false;
      var html = '<div class="qe-karte">' + (introHTML() ? '<div class="qe-intro" style="margin-bottom:1rem">' + introHTML() + '</div>' : '') + '<div class="qe-text" id="qe-text">';
      abschnitte().forEach(function (a) {
        if (a.titel) html += '<h3>' + esc(a.titel) + '</h3>';
        var text = String(a.text || '');
        var out = '', last = 0, m;
        RE.lastIndex = 0;
        while ((m = RE.exec(text))) {
          out += text.slice(last, m.index);
          var idx = luecken.length;
          if (m[1] !== undefined) {
            var varianten = m[1].split('|').map(function (s) { return s.trim(); });
            luecken.push({ antwort: varianten[0], akzeptiert: varianten.map(vergleich), typ: 'input' });
            out += '<input class="qe-luecke" id="qe-l-' + idx + '" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Lücke ' + (idx + 1) + '" style="width:' + Math.max(90, varianten[0].length * 11 + 24) + 'px">';
          } else {
            var opts = m[2].split('|').map(function (s) { return s.trim(); });
            var korrekt = opts[0];
            var reihenfolge = daten.optionenMischen === false ? opts : shuffle(opts);
            luecken.push({ antwort: korrekt, akzeptiert: [vergleich(korrekt)], typ: 'select' });
            out += '<select class="qe-luecke" id="qe-l-' + idx + '" aria-label="Lücke ' + (idx + 1) + '"><option value="">…</option>'
              + reihenfolge.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select>';
          }
          out += '<span class="qe-korrektur" id="qe-k-' + idx + '"></span>';
          last = m.index + m[0].length;
        }
        out += text.slice(last);
        html += /^\s*</.test(out) ? out : '<p>' + out + '</p>';
      });
      html += '</div><div class="qe-aktionen" style="justify-content:space-between">'
        + '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" class="qe-btn qe-btn-primaer" id="qe-auswerten">Auswerten</button>'
        + '<button type="button" class="qe-btn qe-btn-sekundaer" id="qe-neu">Zurücksetzen</button></div>'
        + (daten.loesungErlaubt !== false ? '<button type="button" class="qe-btn qe-btn-sekundaer" id="qe-loesung">Lösung zeigen</button>' : '')
        + '</div></div>';
      inhalt.innerHTML = html;
      luecken.forEach(function (l, i) { l.el = $('qe-l-' + i); l.eigene = ''; });
      $('qe-auswerten').onclick = auswertenAlle;
      $('qe-neu').onclick = neustart;
      if ($('qe-loesung')) $('qe-loesung').onclick = toggleLoesung;
    }

    function markieren() {
      luecken.forEach(function (l, i) {
        var ok = istRichtig(l);
        l.el.classList.remove('qe-ok', 'qe-fail');
        l.el.classList.add(ok ? 'qe-ok' : 'qe-fail');
        $('qe-k-' + i).textContent = ok ? '' : '→ ' + l.antwort;
      });
    }

    function auswertenAlle() {
      if (zeigeLoesung) toggleLoesung();
      ausgewertet = true;
      markieren();
      luecken.forEach(function (l) { l.el.disabled = true; });
      $('qe-auswerten').disabled = true;
      auswerten(aktuell(), '');
    }

    function toggleLoesung() {
      zeigeLoesung = !zeigeLoesung;
      if (zeigeLoesung) {
        loesungAufgedeckt();
        luecken.forEach(function (l, i) {
          l.eigene = l.el.value;
          l.el.value = l.antwort; l.el.disabled = true;
          l.el.classList.remove('qe-ok', 'qe-fail'); l.el.classList.add('qe-loesung');
          $('qe-k-' + i).textContent = '';
        });
      } else {
        luecken.forEach(function (l) {
          l.el.value = l.eigene; l.el.disabled = ausgewertet;
          l.el.classList.remove('qe-loesung');
        });
        if (ausgewertet) markieren();
      }
      $('qe-loesung').textContent = zeigeLoesung ? '↩ Meine Antworten zeigen' : 'Lösung zeigen';
    }

    return { start: start, gesamt: gesamt, aktuell: aktuell };
  }

  /* ======================================================================
     START: JSON laden, Typ wählen
     ====================================================================== */
  var TYPEN = { mc: TypFragen, fragen: TypFragen, bilder: TypBilder, karte: TypKarte, lueckentext: TypLueckentext };

  function fehler(msg) {
    ROOT.innerHTML = '<div class="qe-page"><div class="qe-karte"><strong>Quiz konnte nicht geladen werden.</strong><br>' + esc(msg) + '</div></div>';
  }

  function starten(json) {
    daten = json;
    if (!daten || !daten.slug || !TYPEN[daten.typ]) { fehler('Ungültige Quiz-Daten (slug/typ fehlt).'); return; }
    geruest();
    typ = TYPEN[daten.typ]();
    typ.start();
    window.QuizEngine = { daten: daten, anzahlFragen: anzahlFragen, aktuell: function () { return typ.aktuell(); }, eingefroren: function () { return gesperrt; }, bestenlisteId: lbId,
      pool: function () { return typ.pool ? typ.pool() : null; }, index: function () { return typ.index ? typ.index() : null; } };
  }

  layoutSichern(ROOT);

  var inline = ROOT.getAttribute('data-quiz-inline');
  var quelle = ROOT.getAttribute('data-quiz');
  if (inline && $(inline)) {
    try { starten(JSON.parse($(inline).textContent)); } catch (e) { fehler('JSON-Fehler: ' + e.message); }
  } else if (quelle) {
    fetch(quelle, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(starten)
      .catch(function (e) { fehler(e.message); });
  } else {
    fehler('Kein data-quiz-Attribut gesetzt.');
  }
})();
