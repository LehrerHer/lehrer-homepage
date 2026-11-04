/* ============================================================
   INFORMATIKWERKSTATT 7/8 – Login + Vorname für den Lernpfad

   - prüft den Homepage-Login (Kolosseum-Session) über /api/informatik/status
   - zeigt in #iw-login: ohne Login Hinweis + Login-Link (Rücksprung per ?next),
     eingeloggt ohne Vorname: einmalige Vornamen-Abfrage
   - InformatikLogin.bereit  → Promise mit { eingeloggt, vorname, stationen }
   - InformatikLogin.senden(station, punkte, max) → speichert Checkpoint-Ergebnis

   Der Vorname liegt in einer eigenen Tabelle und ist nur im Admin-Bereich
   „Informatik" sichtbar (kolosseum/public/admin/informatik.html).
   Einbinden VOR dem Seiten-Script: <script src="js/informatik-login.js"></script>
   ============================================================ */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';
  var API = K + '/api/informatik';
  var zustand = { eingeloggt: false, vorname: null, stationen: {}, fehler: false };
  var aufloesen;
  var bereit = new Promise(function (r) { aufloesen = r; });

  async function ladeStatus() {
    try {
      var res = await fetch(API + '/status', { credentials: 'include' });
      if (res.status === 401) return { eingeloggt: false, vorname: null, stationen: {} };
      if (!res.ok) throw new Error('Status ' + res.status);
      var d = await res.json();
      return { eingeloggt: true, vorname: d.vorname, stationen: d.stationen || {} };
    } catch (_) {
      return { eingeloggt: false, vorname: null, stationen: {}, fehler: true };
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
      return { ok: true, bestanden: d.bestanden };
    } catch (_) {
      return { ok: false, grund: 'netz' };
    }
  }

  async function init() {
    zustand = await ladeStatus();
    zeige();
    aufloesen(zustand);
  }

  window.InformatikLogin = { bereit: bereit, senden: senden };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
