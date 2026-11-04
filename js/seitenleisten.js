/**
 * seitenleisten.js – Randspalten (nur ab 1720 px sichtbar, siehe css/style.css)
 *
 *   links  (#seiten-inhalt): mitlaufendes Inhaltsverzeichnis – auf der Startseite aus den
 *                            section[id], auf Unterseiten aus den h2-Überschriften in <main>
 *                            (fehlende Anker-IDs werden ergänzt); aktiver Abschnitt wird vom
 *                            Scroll-Spy in js/main.js markiert. Fehlt das Markup, legt das Script
 *                            die linke Leiste selbst direkt unter der Navbar an (alle Unterseiten).
 *   rechts (#seiten-rand):   nur wo das Markup vorhanden ist (Startseite): Arena-Spalte (eigener
 *                            Gladiator + Top 5 bzw. Login-Teaser) und „Zuletzt benutzt“ (localStorage)
 *
 * Nichts hier ist exklusiv: dieselben Inhalte sind über Navbar, Arena-Leiste und
 * die Seite selbst erreichbar. Unterhalb von 1720 px bleibt alles ausgeblendet.
 */
(function () {
  'use strict';

  var K = 'https://kolosseum.lehrer-herrmann.de';
  var LS_ZULETZT = 'lh_zuletzt_benutzt';
  /* Stufen wie in kolosseum/routes/public.js (LEVELS) */
  var STUFEN = [
    { name: 'Rekrut',    min: 0,    icon: '🪖' },
    { name: 'Gladiator', min: 100,  icon: '⚔️' },
    { name: 'Kämpfer',   min: 250,  icon: '🗡️' },
    { name: 'Krieger',   min: 500,  icon: '🛡️' },
    { name: 'Veteran',   min: 900,  icon: '🔱' },
    { name: 'Champion',  min: 1400, icon: '👑' },
    { name: 'Legende',   min: 2000, icon: '🏆' }
  ];

  var inhalt = document.getElementById('seiten-inhalt');
  var rand   = document.getElementById('seiten-rand');
  var MAX_EINTRAEGE = 14;

  /* Unterseiten ohne eigenes Markup: linke Leiste direkt unter der Navbar anlegen */
  if (!inhalt && !rand) {
    var navbar = document.querySelector('nav.navbar');
    if (!navbar || !navbar.parentNode) return;
    var wrap = document.createElement('div');
    wrap.className = 'seitenleisten';
    wrap.innerHTML = '<nav class="seitenleiste seitenleiste-links" id="seiten-inhalt" aria-label="Abschnitte dieser Seite" data-scrollspy></nav>';
    navbar.parentNode.insertBefore(wrap, navbar.nextSibling);
    inhalt = document.getElementById('seiten-inhalt');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stufe(xp) {
    for (var i = STUFEN.length - 1; i >= 0; i--) if (xp >= STUFEN[i].min) return STUFEN[i];
    return STUFEN[0];
  }
  function naechsteStufe(xp) {
    for (var i = 0; i < STUFEN.length; i++) if (STUFEN[i].min > xp) return STUFEN[i];
    return null;
  }

  /* ───────────── Inhaltsverzeichnis (links) ───────────── */
  function slug(text) {
    return String(text || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'abschnitt';
  }
  function sichtbar(el) { return !!el && el.offsetParent !== null; }

  /* Einträge: Startseite → section[id]; Unterseiten → h2 in <main> (IDs werden ergänzt) */
  function eintraegeSammeln() {
    var sektionen = Array.prototype.slice.call(document.querySelectorAll('section[id]'));
    if (sektionen.length >= 3) {
      return sektionen.map(function (s) {
        var titel = s.getAttribute('data-inhalt');
        if (!titel) { var h = s.querySelector('h1, h2, h3'); if (h) titel = h.textContent; }
        if (!titel && s.getAttribute('aria-labelledby')) { var l = document.getElementById(s.getAttribute('aria-labelledby')); if (l) titel = l.textContent; }
        return { el: s, id: s.id, titel: (titel || s.id).replace(/\s+/g, ' ').trim() };
      });
    }
    var wurzel = document.querySelector('main') || document.body;
    var vergeben = {};
    return Array.prototype.slice.call(wurzel.querySelectorAll('h2'))
      .filter(function (h) { return sichtbar(h) && !h.closest('nav, footer, .seitenleiste, [hidden]') && h.textContent.trim(); })
      .map(function (h) {
        var titel = h.textContent.replace(/\s+/g, ' ').trim();
        if (!h.id) {
          var basis = 'abschnitt-' + slug(titel), id = basis, n = 2;
          while (document.getElementById(id) || vergeben[id]) id = basis + '-' + (n++);
          h.id = id;
        }
        vergeben[h.id] = true;
        return { el: h, id: h.id, titel: titel.length > 60 ? titel.slice(0, 57) + '…' : titel };
      });
  }

  function inhaltsverzeichnis() {
    if (!inhalt) return;
    var eintraege = eintraegeSammeln();
    if (eintraege.length < 2) { inhalt.hidden = true; return; }
    if (eintraege.length > MAX_EINTRAEGE) eintraege = eintraege.slice(0, MAX_EINTRAEGE);

    inhalt.innerHTML = '<div class="seitenleiste-block"><p class="seitenleiste-titel">Auf dieser Seite</p><ul>'
      + eintraege.map(function (e) {
          return '<li data-fuer="' + esc(e.id) + '"><a href="#' + esc(e.id) + '">' + esc(e.titel) + '</a></li>';
        }).join('')
      + '</ul></div>';

    /* Abschnitte, die das Login-Gate ausblendet, auch hier ausblenden */
    function sichtbarkeit() {
      eintraege.forEach(function (e) {
        var li = inhalt.querySelector('li[data-fuer="' + e.id + '"]');
        if (li) li.hidden = e.el.offsetParent === null;
      });
      document.dispatchEvent(new Event('scrollspy:aktualisieren'));
    }
    sichtbarkeit();
    if (window.MutationObserver) {
      var mo = new MutationObserver(sichtbarkeit);
      eintraege.forEach(function (e) { mo.observe(e.el.tagName === 'SECTION' ? e.el : (e.el.parentNode || e.el), { attributes: true, attributeFilter: ['style', 'hidden', 'class'] }); });
    }
  }

  /* ───────────── Arena-Spalte (rechts oben) ───────────── */
  function arenaBlock() {
    var box = document.createElement('div');
    box.className = 'seitenleiste-block';
    box.id = 'arena-spalte';
    box.innerHTML = '<p class="seitenleiste-titel">Arena</p><p class="arena-spalte-hinweis">Lädt …</p>';
    return box;
  }

  function arenaAusgeloggt(box) {
    box.innerHTML = '<p class="seitenleiste-titel">Arena</p>'
      + '<div class="arena-spalte-kopf"><span class="arena-spalte-icon" aria-hidden="true">🏛️</span>'
      + '<div><div class="arena-spalte-name">Lernkolosseum</div><div class="arena-spalte-rang">Gladiatorenkämpfe</div></div></div>'
      + '<p class="arena-spalte-hinweis">Quizze spielen, Kampferfahrung sammeln und mit deinem Gladiator in der Rangliste aufsteigen.</p>'
      + '<a class="btn-klein" href="' + K + '/login.html" rel="noopener">Einloggen</a>'
      + '<a class="btn-klein btn-klein-hell" href="' + K + '/register.html" rel="noopener">Gladiator werden</a>';
  }

  function arenaEingeloggt(box, me, rangliste) {
    var xp = Number(me.xp) || 0;
    var st = stufe(xp), next = naechsteStufe(xp);
    var fortschritt = next ? Math.round((xp - st.min) / (next.min - st.min) * 100) : 100;
    var top = Array.isArray(rangliste) ? rangliste.slice(0, 5) : [];
    var html = '<p class="seitenleiste-titel">Arena</p>'
      + '<div class="arena-spalte-kopf"><span class="arena-spalte-icon" aria-hidden="true">' + st.icon + '</span>'
      + '<div style="min-width:0"><div class="arena-spalte-name" title="' + esc(me.nick) + '">' + esc(me.nick) + '</div>'
      + '<div class="arena-spalte-rang">' + esc(st.name) + ' · ' + xp + '&thinsp;XP</div></div></div>'
      + '<div class="arena-spalte-balken" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + fortschritt + '"'
      + ' aria-label="Fortschritt zur nächsten Stufe"><span style="width:' + fortschritt + '%"></span></div>'
      + '<p class="arena-spalte-hinweis">' + (next ? 'Noch ' + (next.min - xp) + '&thinsp;XP bis ' + esc(next.name) : 'Höchste Stufe erreicht') + '</p>';
    if (top.length) {
      html += '<p class="seitenleiste-titel" style="margin-top:12px">Top 5</p><ol class="arena-top">'
        + top.map(function (r, i) {
            var ich = r.nick === me.nick;
            return '<li' + (ich ? ' class="arena-top-ich" aria-current="true"' : '') + '>'
              + '<span class="arena-top-rang">' + (i + 1) + '.</span>'
              + '<span class="arena-top-nick">' + esc(r.nick) + '</span>'
              + '<span class="arena-top-xp">' + (Number(r.xp) || 0) + ' XP</span></li>';
          }).join('') + '</ol>';
    }
    html += '<a class="btn-klein" href="' + K + '/profil.html" rel="noopener">Zum Profil</a>'
      + '<a class="btn-klein btn-klein-hell" href="' + K + '/rangliste.html" rel="noopener">Rangliste</a>';
    box.innerHTML = html;
  }

  async function arenaLaden(box) {
    try {
      var r = await fetch(K + '/api/auth/me', { credentials: 'include' });
      if (!r.ok) { arenaAusgeloggt(box); return; }
      var me = await r.json();
      var rangliste = [];
      try {
        var rl = await fetch(K + '/api/students/rangliste', { credentials: 'include' });
        if (rl.ok) rangliste = await rl.json();
      } catch (e) { /* Rangliste optional */ }
      arenaEingeloggt(box, me, rangliste);
    } catch (e) {
      arenaAusgeloggt(box);
    }
  }

  /* ───────────── Zuletzt benutzt (rechts unten) ───────────── */
  function zuletztBlock() {
    var box = document.createElement('div');
    box.className = 'seitenleiste-block';
    box.id = 'zuletzt-benutzt';
    var liste = [];
    try { liste = JSON.parse(localStorage.getItem(LS_ZULETZT) || '[]'); } catch (e) { liste = []; }
    if (!Array.isArray(liste)) liste = [];
    liste = liste.filter(function (e) { return e && typeof e.url === 'string' && /^\/[^\s]*$/.test(e.url); }).slice(0, 3);

    var html = '<p class="seitenleiste-titel">Zuletzt benutzt</p>';
    if (!liste.length) {
      html += '<p class="zuletzt-leer">Noch nichts geöffnet. Hier erscheinen die drei zuletzt geöffneten Quizze und Arbeitsblätter – nur auf diesem Gerät gespeichert.</p>';
    } else {
      html += '<ul class="zuletzt-liste">' + liste.map(function (e) {
        var d = e.zeit ? new Date(e.zeit) : null;
        return '<li><a href="' + esc(e.url) + '">' + esc(e.titel || e.url)
          + (d && !isNaN(d) ? '<small>' + d.toLocaleDateString('de-DE') + '</small>' : '') + '</a></li>';
      }).join('') + '</ul>';
    }
    box.innerHTML = html;
    return box;
  }

  /* ───────────── Aufbau ───────────── */
  inhaltsverzeichnis();
  if (rand) {
    var a = arenaBlock();
    rand.appendChild(a);
    rand.appendChild(zuletztBlock());
    arenaLaden(a);
  }
})();
