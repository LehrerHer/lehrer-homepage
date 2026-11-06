/* ================================================================
   Informatikwerkstatt 7/8 – Glossar
   EINE Liste für alle Seiten: Erklärfenster an Ort und Stelle und die
   Glossarseite (informatikwerkstatt-glossar.html) lesen beide hieraus.

   Begriff im Text markieren (bekommt automatisch ein Sternchen):
     <a class="gl" href="informatikwerkstatt-glossar.html#tab" data-gl="tab">Tab</a>
   Ohne JavaScript führt der Link einfach zur Glossarseite.

   Neuer Begriff: unten in BEGRIFFE ergänzen (Schlüssel = Anker auf der Glossarseite).
   ================================================================ */
(function () {
  'use strict';

  var GLOSSAR_SEITE = 'informatikwerkstatt-glossar.html';

  var BEGRIFFE = {
    'browser': {
      wort: 'Browser',
      text: 'Ein Programm, mit dem du Internetseiten öffnest. Bekannte Browser sind Chrome, Firefox, Safari und Edge.'
    },
    'tab': {
      wort: 'Tab',
      text: 'Eine Registerkarte im Browser. Oben im Fenster liegen die Tabs nebeneinander. In jedem Tab kann eine andere Internetseite offen sein. Ein Klick auf einen Tab wechselt zu dieser Seite.',
      tipp: 'Einen neuen Tab öffnest du mit dem Plus-Zeichen (+) neben dem letzten Tab.'
    },
    'programm': {
      wort: 'Programm',
      text: 'Eine Folge von Befehlen, die ein Computer ausführt. In Scratch ist dein ganzes Projekt das Programm – mit allen Skripten aller Figuren.'
    },
    'skript': {
      wort: 'Skript',
      text: 'In Scratch ein Stapel zusammengesteckter Blöcke. Er beginnt mit einem Startblock aus „Ereignisse“. Ein Programm kann aus vielen Skripten bestehen.'
    },
    'dateiendung': {
      wort: 'Dateiendung',
      text: 'Die Buchstaben nach dem letzten Punkt im Dateinamen, zum Beispiel .sb3, .jpg oder .pdf. Sie zeigt, was für eine Datei es ist und welches Programm sie öffnen kann.',
      tipp: 'Beispiel: In „Erkundungstour Mia.sb3“ ist .sb3 die Dateiendung.'
    },
    'sb3': {
      wort: '.sb3',
      text: 'Die Dateiendung für Scratch-Projekte. Du bekommst sie über „Datei → Auf deinem Computer speichern“. Öffnen kannst du sie in Scratch über „Datei → Von deinem Computer hochladen“.'
    },
    'koordinatensystem': {
      wort: 'Koordinatensystem',
      text: 'Zwei Zahlenstrahlen, die sich in der Mitte kreuzen: die x-Achse (waagerecht) und die y-Achse (senkrecht). Mit zwei Zahlen (x und y) beschreibst du genau einen Punkt.',
      mehr: { url: 'informatikwerkstatt-koordinatensystem.html', text: 'Ausführlich erklärt' }
    }
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Erklärfenster an Ort und Stelle ---------- */
  var fenster = null, ausloeser = null;

  function schliessen() {
    if (!fenster) return;
    fenster.remove();
    fenster = null;
    if (ausloeser) { ausloeser.setAttribute('aria-expanded', 'false'); ausloeser.focus(); ausloeser = null; }
  }

  function oeffnen(link) {
    var b = BEGRIFFE[link.dataset.gl];
    if (!b) return false;
    var war = ausloeser;
    schliessen();
    if (war === link) return true; // zweites Antippen schließt
    ausloeser = link;
    link.setAttribute('aria-expanded', 'true');
    fenster = document.createElement('div');
    fenster.className = 'gl-fenster';
    fenster.setAttribute('role', 'dialog');
    fenster.setAttribute('aria-label', 'Erklärung: ' + b.wort);
    fenster.innerHTML =
      '<button type="button" class="gl-zu" aria-label="Erklärung schließen">×</button>' +
      '<p class="gl-titel">' + esc(b.wort) + '</p>' +
      '<p>' + esc(b.text) + '</p>' +
      (b.tipp ? '<p>' + esc(b.tipp) + '</p>' : '') +
      '<p class="gl-mehr">' +
      (b.mehr ? '<a href="' + esc(b.mehr.url) + '">' + esc(b.mehr.text) + ' →</a> · ' : '') +
      '<a href="' + GLOSSAR_SEITE + '">Alle Begriffe im Glossar</a></p>';
    document.body.appendChild(fenster);
    // unter dem Begriff platzieren, im sichtbaren Bereich halten
    var r = link.getBoundingClientRect();
    var breite = fenster.offsetWidth;
    var links = Math.min(Math.max(12, r.left), document.documentElement.clientWidth - breite - 12);
    fenster.style.left = (links + window.scrollX) + 'px';
    fenster.style.top = (r.bottom + window.scrollY + 6) + 'px';
    fenster.querySelector('.gl-zu').addEventListener('click', schliessen);
    fenster.querySelector('.gl-zu').focus();
    return true;
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a.gl[data-gl]');
    if (link) {
      if (oeffnen(link)) e.preventDefault();
      return;
    }
    if (fenster && !fenster.contains(e.target)) schliessen();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') schliessen(); });
  window.addEventListener('resize', schliessen);

  document.querySelectorAll('a.gl[data-gl]').forEach(function (a) {
    a.setAttribute('aria-expanded', 'false');
    if (!a.title) a.title = 'Erklärung anzeigen';
  });

  /* ---------- Glossarseite: Liste A–Z ---------- */
  var liste = document.getElementById('glossar-liste');
  if (liste) {
    var schluessel = Object.keys(BEGRIFFE).sort(function (a, b) {
      return BEGRIFFE[a].wort.replace(/^\./, '').localeCompare(BEGRIFFE[b].wort.replace(/^\./, ''), 'de');
    });
    liste.innerHTML = schluessel.map(function (k) {
      var b = BEGRIFFE[k];
      return '<div class="gl-eintrag" id="' + k + '"><dt>' + esc(b.wort) + '</dt><dd><p>' + esc(b.text) + '</p>' +
        (b.tipp ? '<p>' + esc(b.tipp) + '</p>' : '') +
        (b.mehr ? '<p><a href="' + esc(b.mehr.url) + '">' + esc(b.mehr.text) + ' →</a></p>' : '') + '</dd></div>';
    }).join('');
    if (location.hash) {
      var ziel = document.getElementById(location.hash.slice(1));
      if (ziel) { ziel.classList.add('gl-markiert'); ziel.scrollIntoView(); }
    }
  }
})();
