/* ================================================================
   Informatikwerkstatt 7/8 – Fortschritts-Puzzle
   Kleines Puzzle in der mitlaufenden Teile-Leiste (nav.teile). Jede
   gelöste Aufgabe fügt ein Teil hinzu; sind alle da, erscheint ein Stern.

   Einbinden (nach informatik-login.js):
     <script src="js/iw-puzzle.js"></script>
     IwPuzzle.start(['teil1-1', 'teil2-1', …, 'upload']);   // Schlüssel aller Teile
     IwPuzzle.teil('teil2-1');                               // ein Teil ist gelöst
   Unbekannte oder doppelte Schlüssel werden ignoriert.
   ================================================================ */
(function () {
  'use strict';

  var schluessel = [], geloest = {}, box = null, teile = [];
  var SPALTEN = 4, ZEILEN = 2, G = 15, ABST = 17;

  function zeichnen() {
    var svg = '<svg viewBox="0 0 74 40" aria-hidden="true" focusable="false">';
    for (var i = 0; i < SPALTEN * ZEILEN; i++) {
      var c = i % SPALTEN, r = Math.floor(i / SPALTEN), x = 2 + c * ABST, y = 2 + r * ABST;
      svg += '<g class="pz-teil f' + ((c + r) % 2) + '"><rect x="' + x + '" y="' + y + '" width="' + G + '" height="' + G + '" rx="2"/>';
      if (c < SPALTEN - 1) svg += '<circle cx="' + (x + G + 1) + '" cy="' + (y + G / 2) + '" r="3"/>';
      if (r < ZEILEN - 1) svg += '<circle cx="' + (x + G / 2) + '" cy="' + (y + G + 1) + '" r="3"/>';
      svg += '</g>';
    }
    svg += '<text class="pz-stern" x="37" y="26" text-anchor="middle" font-size="18" fill="#fff" stroke="#1e3a5f" stroke-width="0.8">★</text></svg>';
    return svg;
  }

  function anzeigen(neu) {
    if (!box) return;
    var n = Object.keys(geloest).length, gesamt = schluessel.length;
    // Teile anteilig füllen (Puzzle hat immer 8 Teile)
    var voll = gesamt ? Math.round(n / gesamt * teile.length) : 0;
    teile.forEach(function (t, i) {
      var war = t.classList.contains('da');
      t.classList.toggle('da', i < voll);
      if (neu && !war && i < voll) { t.classList.remove('neu'); void t.getBBox(); t.classList.add('neu'); }
    });
    box.classList.toggle('fertig', n >= gesamt && gesamt > 0);
    box.querySelector('.pz-text').textContent = n + '/' + gesamt;
    box.setAttribute('aria-label', 'Puzzle: ' + n + ' von ' + gesamt + ' Teilen gelöst');
  }

  window.IwPuzzle = {
    start: function (liste) {
      schluessel = liste.slice();
      var leiste = document.querySelector('nav.teile .iw-wrap');
      if (!leiste) return;
      box = document.createElement('div');
      box.className = 'iw-puzzle';
      box.setAttribute('role', 'img');
      box.title = 'Jede gelöste Aufgabe bringt ein Puzzleteil';
      box.innerHTML = zeichnen() + '<span class="pz-text"></span>';
      leiste.insertBefore(box, leiste.firstChild);
      teile = Array.prototype.slice.call(box.querySelectorAll('.pz-teil'));
      anzeigen(false);
    },
    teil: function (id, still) {
      if (schluessel.indexOf(id) < 0 || geloest[id]) return;
      geloest[id] = true;
      anzeigen(!still);
    }
  };
})();
