/* ============================================================
   INFORMATIKWERKSTATT 7/8 – Login + Vorname für den Lernpfad

   - prüft den Homepage-Login (Kolosseum-Session) über /api/informatik/status
   - zeigt in #iw-login: ohne Login Hinweis + Login-Link (Rücksprung per ?next),
     eingeloggt ohne Vorname: einmalige Vornamen-Abfrage
   - InformatikLogin.bereit  → Promise mit { eingeloggt, vorname, stationen }
   - InformatikLogin.senden(station, punkte, max) → speichert Checkpoint-Ergebnis
   - InformatikLogin.profiMelden(station, teil, status, geloest, gesamt, fehlversuche)
     → Profi-Teil 'geloest' oder 'angesehen' (erste Meldung zählt)
   - InformatikLogin.antwortSenden(station, frage, text) → freie Antwort (erste zählt)
   - InformatikLogin.xpAufgabe(station, id) / xpTeil(station, teil, [ids]) → 5 bzw. 25 XP (einmalig)
   - InformatikLogin.scratchHochladen(station, datei) → Scratch-Projekt (.sb3) hochladen, erstes Mal 25 XP

   Der Vorname liegt in einer eigenen Tabelle und ist nur im Admin-Bereich
   „Informatik" sichtbar (kolosseum/public/admin/informatik.html).
   Einbinden VOR dem Seiten-Script: <script src="js/informatik-login.js"></script>
   ============================================================ */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';
  var API = K + '/api/informatik';
  var zustand = { eingeloggt: false, vorname: null, stationen: {}, profi: {}, antworten: {}, xp: [], scratch: {}, fehler: false };
  var aufloesen;
  var bereit = new Promise(function (r) { aufloesen = r; });

  async function ladeStatus() {
    try {
      var res = await fetch(API + '/status', { credentials: 'include' });
      if (res.status === 401) return { eingeloggt: false, vorname: null, stationen: {}, profi: {}, antworten: {}, xp: [], scratch: {} };
      if (!res.ok) throw new Error('Status ' + res.status);
      var d = await res.json();
      return { eingeloggt: true, vorname: d.vorname, stationen: d.stationen || {}, profi: d.profi || {}, antworten: d.antworten || {}, xp: d.xp || [], scratch: d.scratch || {} };
    } catch (_) {
      return { eingeloggt: false, vorname: null, stationen: {}, profi: {}, antworten: {}, xp: [], scratch: {}, fehler: true };
    }
  }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text) e.textContent = text;
    return e;
  }

  function zeige() {
    var box = document.getElementById('iw-login');
    if (!box) return;
    box.innerHTML = '';
    box.hidden = false;

    if (zustand.fehler) {
      box.className = 'iw-login iw-login-fehlt';
      box.appendChild(el('p', '', 'Der Login konnte gerade nicht geprüft werden. Prüfe die Internetverbindung und lade die Seite neu.'));
      return;
    }

    if (!zustand.eingeloggt) {
      box.className = 'iw-login iw-login-fehlt';
      box.appendChild(el('p', '', 'Melde dich mit deinem Lernkolosseum-Konto an. Nur dann wird dein Fortschritt gespeichert.'));
      var a = el('a', 'iw-btn', 'Jetzt einloggen');
      a.href = K + '/login.html?next=' + encodeURIComponent(window.location.href);
      box.appendChild(a);
      return;
    }

    if (!zustand.vorname) {
      box.className = 'iw-login iw-login-name';
      box.appendChild(el('p', '', 'Einmalig: Wie heißt du mit Vornamen? Nur deine Lernbegleitung sieht ihn – damit sie deine Ergebnisse zuordnen kann.'));
      var form = el('form', 'iw-name-form');
      var inp = el('input');
      inp.type = 'text';
      inp.maxLength = 40;
      inp.autocomplete = 'given-name';
      inp.setAttribute('aria-label', 'Dein Vorname');
      inp.placeholder = 'Vorname';
      var btn = el('button', 'iw-btn', 'Speichern');
      btn.type = 'submit';
      var meldung = el('span', 'iw-meldung');
      meldung.setAttribute('aria-live', 'polite');
      form.appendChild(inp);
      form.appendChild(btn);
      form.appendChild(meldung);
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var vorname = inp.value.trim();
        if (vorname.length < 2) { meldung.textContent = 'Bitte gib deinen Vornamen ein.'; return; }
        btn.disabled = true;
        try {
          var res = await fetch(API + '/vorname', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vorname: vorname })
          });
          var d = await res.json().catch(function () { return {}; });
          if (!res.ok && res.status !== 409) throw new Error(d.error || 'Speichern fehlgeschlagen.');
          zustand.vorname = vorname;
          zeige();
        } catch (err) {
          meldung.textContent = err.message;
          btn.disabled = false;
        }
      });
      box.appendChild(form);
      return;
    }

    box.className = 'iw-login iw-login-ok';
    var p = el('p');
    p.appendChild(document.createTextNode('✓ Angemeldet – dein Fortschritt wird gespeichert, '));
    p.appendChild(el('strong', '', zustand.vorname));
    p.appendChild(document.createTextNode('.'));
    box.appendChild(p);
  }

  async function senden(station, punkte, max) {
    var s = await bereit;
    if (!s.eingeloggt) return { ok: false, grund: 'login' };
    if (!s.vorname) return { ok: false, grund: 'vorname' };
    try {
      var res = await fetch(API + '/checkpoint', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station: station, punkte: punkte, max: max })
      });
      if (!res.ok) throw new Error();
      var d = await res.json();
      xpMelden(d.xp);
      return { ok: true, bestanden: d.bestanden, xp: d.xp || 0 };
    } catch (_) {
      return { ok: false, grund: 'netz' };
    }
  }

  // Profi-Teil melden: status 'geloest' oder 'angesehen'
  async function profiMelden(station, teil, status, geloest, gesamt, fehlversuche) {
    var s = await bereit;
    if (!s.eingeloggt || !s.vorname) return { ok: false };
    try {
      var res = await fetch(API + '/profi', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station: station, teil: teil, status: status, geloest: geloest, gesamt: gesamt, fehlversuche: fehlversuche })
      });
      if (!res.ok) throw new Error();
      var d = await res.json();
      s.profi[station + '-' + teil] = d.status;
      return { ok: true, status: d.status };
    } catch (_) {
      return { ok: false };
    }
  }

  // Freie Antwort senden (z. B. Denkfrage) – erste Antwort ist endgültig
  async function antwortSenden(station, frage, text) {
    var s = await bereit;
    if (!s.eingeloggt) return { ok: false, grund: 'login' };
    if (!s.vorname) return { ok: false, grund: 'vorname' };
    try {
      var res = await fetch(API + '/antwort', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station: station, frage: frage, text: text })
      });
      if (!res.ok) throw new Error();
      var d = await res.json();
      s.antworten[station + '-' + frage] = d.text;
      return { ok: true, text: d.text };
    } catch (_) {
      return { ok: false, grund: 'netz' };
    }
  }

  // Gutgeschriebene XP an die XP-Leiste (js/arena-bar.js) melden, damit sie live mitzählt
  function xpMelden(xp) {
    if (!(xp > 0)) return;
    try { window.dispatchEvent(new CustomEvent('kolosseum:xp', { detail: { xp: xp } })); } catch (_) {}
  }

  // XP: selbst gelöste Aufgabe (5) bzw. ganzer Teil (25) – der Server vergibt jeden Schlüssel nur einmal
  async function xpPost(pfad, daten) {
    var s = await bereit;
    if (!s.eingeloggt || !s.vorname) return { ok: false, xp: 0 };
    try {
      var res = await fetch(API + pfad, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(daten)
      });
      if (!res.ok) throw new Error();
      var d = await res.json();
      xpMelden(d.xp);
      return { ok: true, xp: d.xp || 0 };
    } catch (_) {
      return { ok: false, xp: 0 };
    }
  }
  function xpAufgabe(station, id) {
    return xpPost('/xp/aufgabe', { station: station, id: id }).then(function (r) {
      if (r.ok) zustand.xp.push('a:' + station + ':' + id);
      return r;
    });
  }
  function xpTeil(station, teil, aufgaben) {
    return xpPost('/xp/teil', { station: station, teil: teil, aufgaben: aufgaben }).then(function (r) {
      if (r.ok) zustand.xp.push('t:' + station + ':' + teil);
      return r;
    });
  }

  // Scratch-Projekt hochladen (FormData, kein JSON). Ein neues ersetzt das alte.
  async function scratchHochladen(station, datei) {
    var s = await bereit;
    if (!s.eingeloggt) return { ok: false, grund: 'login' };
    if (!s.vorname) return { ok: false, grund: 'vorname' };
    var fd = new FormData();
    fd.append('station', String(station));
    fd.append('datei', datei);
    try {
      var res = await fetch(API + '/scratch', { method: 'POST', credentials: 'include', body: fd });
      var d = await res.json().catch(function () { return {}; });
      if (!res.ok) return { ok: false, grund: 'fehler', meldung: d.error || 'Hochladen fehlgeschlagen.' };
      s.scratch[station] = { name: d.name, am: new Date().toISOString() };
      xpMelden(d.xp);
      return { ok: true, name: d.name, xp: d.xp || 0 };
    } catch (_) {
      return { ok: false, grund: 'netz' };
    }
  }

  async function init() {
    zustand = await ladeStatus();
    zeige();
    aufloesen(zustand);
  }

  window.InformatikLogin = { bereit: bereit, senden: senden, profiMelden: profiMelden, antwortSenden: antwortSenden, xpAufgabe: xpAufgabe, xpTeil: xpTeil, scratchHochladen: scratchHochladen };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
