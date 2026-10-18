/* ============================================================
   REGELRADAR – Login-Anbindung für alle Testseiten
   (Diktat, Selbsttest, Selbsttest 2, Strategieabfrage, Quatsch)

   - prüft den Homepage-Login (Kolosseum-Session, wie homepage-gate.js)
   - zeigt den Status in #rr-login-status; ohne Login: Hinweis + Link,
     Start-Button ([data-rr-start]) und Namensfeld (#inp-name) gesperrt
   - belegt #inp-name mit dem zuletzt eingegebenen echten Namen vor
   - RegelRadarLogin.senden(daten) speichert das Ergebnis am Account

   Einbinden VOR dem Seiten-Script: <script src="js/regelradar-login.js"></script>
   ============================================================ */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';
  var status = { geprueft: false, eingeloggt: false, nick: '' };

  async function pruefeLogin() {
    try {
      var res = await fetch(K + '/api/auth/me', { credentials: 'include' });
      if (!res.ok) return { eingeloggt: false };
      var me = await res.json();
      return { eingeloggt: !!(me && me.nick), nick: me.nick || '' };
    } catch (_) {
      return { eingeloggt: false, fehler: true };
    }
  }

  async function ladeEchtenNamen() {
    try {
      var res = await fetch(K + '/api/regelradar/mein-name', { credentials: 'include' });
      if (!res.ok) return '';
      var d = await res.json();
      return d.echterName || '';
    } catch (_) {
      return '';
    }
  }

  function zeigeStatus(ergebnis) {
    var box    = document.getElementById('rr-login-status');
    var start  = document.querySelector('[data-rr-start]');
    var name   = document.getElementById('inp-name');
    if (!box) return;

    box.innerHTML = '';
    if (ergebnis.eingeloggt) {
      box.className = 'rr-login-status rr-login-ok';
      var text = document.createElement('span');
      text.textContent = '✓ Angemeldet als ';
      var nick = document.createElement('strong');
      nick.textContent = ergebnis.nick;
      text.appendChild(nick);
      box.appendChild(text);
      if (start) start.disabled = false;
      if (name) name.disabled = false;
      return;
    }

    box.className = 'rr-login-status rr-login-fehlt';
    var hinweis = document.createElement('p');
    hinweis.textContent = ergebnis.fehler
      ? 'Der Login konnte gerade nicht geprüft werden. Bitte Internetverbindung prüfen und die Seite neu laden.'
      : 'Für die Diagnostik musst du auf der Homepage eingeloggt sein. Danach geht es direkt hier weiter.';
    box.appendChild(hinweis);
    if (!ergebnis.fehler) {
      var link = document.createElement('a');
      link.className = 'btn btn-primary';
      link.href = K + '/login.html?next=' + encodeURIComponent(window.location.href);
      link.textContent = 'Jetzt einloggen';
      box.appendChild(link);
    }
    if (start) start.disabled = true;
    if (name) name.disabled = true;
  }

  async function init() {
    var ergebnis = await pruefeLogin();
    status = { geprueft: true, eingeloggt: ergebnis.eingeloggt, nick: ergebnis.nick || '' };
    zeigeStatus(ergebnis);
    if (ergebnis.eingeloggt) {
      var feld = document.getElementById('inp-name');
      if (feld && !feld.value) feld.value = await ladeEchtenNamen();
    }
  }

  // Ergebnis am Account speichern. daten: { echter_name, format, variante, kategorien, items }
  async function senden(daten) {
    var res;
    try {
      res = await fetch(K + '/api/regelradar/ergebnis', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(daten)
      });
    } catch (_) {
      throw new Error('Senden fehlgeschlagen – Internetverbindung prüfen und nochmal versuchen');
    }
    if (res.status === 401) throw new Error('Du bist nicht mehr eingeloggt – bitte neu einloggen und nochmal senden');
    if (!res.ok) {
      var d = await res.json().catch(function () { return {}; });
      throw new Error(d.error || 'Senden fehlgeschlagen – bitte nochmal versuchen');
    }
    return res.json();
  }

  window.RegelRadarLogin = {
    senden: senden,
    eingeloggt: function () { return status.eingeloggt; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
