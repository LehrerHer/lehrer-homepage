/* ============================================================
   WAS IST NEU? – Kompakte Neuigkeiten-Übersicht (je 2 pro Kategorie)
   Jan Herrmann · Oberschule Spelle

   Kategorien:
     1. Neue Funktionen  (manuell gepflegt)
     2. Quiz-Bestenliste (Kolosseum API)
     3. Avataraufstiege  (Kolosseum API)
     4. Neue Materialien (inhalte.json)
     5. Blogbeiträge     (Kolosseum API)
   ============================================================ */

(function () {
    'use strict';

    var QUIZ_URLS = {
        stilmittel:          'stilmittel-quiz.html',
        literaturwissenschaft: 'literaturwissenschaft_quiz_v2.html'
    };
    var QUIZ_LABELS = {
        stilmittel:          'Stilmittel-Quiz',
        literaturwissenschaft: 'Literaturwissenschaft-Quiz',
        name_from_beispiel:  'Bsp → Name',
        name_from_erklaerung:'Erkl → Name',
        wirkung_from_name:   'Name → Wirkung',
        name_from_wirkung:   'Wkg → Name',
        mixed:               'Gemischt',
        gesamt:              'Gesamt'
    };

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatDatum(isoStr, nurDatum) {
        if (!isoStr) return '–';
        try {
            var d = new Date(isoStr);
            var datumTeil = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
            if (nurDatum) return datumTeil;
            return datumTeil + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return String(isoStr); }
    }

    var API = (typeof API_BASE !== 'undefined') ? API_BASE : 'https://kolosseum.lehrer-herrmann.de';

    /* ---- Datenquellen (max. 2 pro Kategorie) ---- */

    function ladeMaterialien() {
        return fetch('inhalte.json?t=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : { materialien: [] }; })
            .then(function (d) {
                return (d.materialien || []).slice()
                    .sort(function (a, b) { return (b.datum || '').localeCompare(a.datum || ''); })
                    .slice(0, 3)
                    .map(function (m) {
                        return {
                            icon: '📥', kat: 'Materialien',
                            titel: m.titel, meta: m.beschreibung || '',
                            datum: m.datum ? m.datum + 'T00:00:00' : null,
                            url:  m.url || 'index.html#digitalematerialien',
                            nurDatum: true
                        };
                    });
            })
            .catch(function () { return []; });
    }

    function ladeBlogbeitraege() {
        return fetch(API + '/api/blog?limit=3')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 3).map(function (b) {
                    return {
                        icon: '✍️', kat: 'Blog',
                        titel: b.titel,
                        meta: (b.autor || '') + (b.klasse ? ' \xB7 Kl. ' + b.klasse : ''),
                        datum: b.datum, url: 'blog.html'
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeQuizBestenliste() {
        return fetch(API + '/api/leaderboard/alle?limit=3')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 3).map(function (e) {
                    return {
                        icon: '🏆', kat: 'Quiz-Bestleistung',
                        titel: esc(e.name || '???') + ' – ' + e.prozent + ' %',
                        meta: QUIZ_LABELS[e.quiz] || e.quiz,
                        datum: e.datum, url: QUIZ_URLS[e.quiz] || 'index.html#digitalematerialien'
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeAvataraufstiege() {
        return fetch(API + '/api/public/recent-gladiatoren')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.map(function (g) {
                    return {
                        icon: g.level_icon || '⚔️', kat: 'Avatar-Aufstieg',
                        titel: esc(g.nickname) + ' → ' + esc(g.level_name),
                        meta:  g.xp + ' XP',
                        datum: g.last_active,
                        url:   'https://kolosseum.lehrer-herrmann.de/rangliste.html'
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeLetzterSpitzname() {
        return fetch(API + '/api/public/letzter-spitzname')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d || !d.nick) return [];
                return [{
                    icon: '🪖', kat: 'Neuer Gladiator',
                    titel: esc(d.nick),
                    meta: 'Neu registriert',
                    datum: d.created_at,
                    url: 'https://kolosseum.lehrer-herrmann.de/rangliste.html'
                }];
            })
            .catch(function () { return []; });
    }

    function ladeEntwicklungen() {
        var eintraege = [
            { titel: 'Kolosseum: Fächer & Materialien + Fortschritt', datum: '2026-04-29T12:00:00', url: 'kolosseum.html' },
            { titel: 'Arena-Statusleiste auf allen Seiten', datum: '2026-04-28T12:00:00', url: 'kolosseum.html' },
            { titel: 'Neue Kolosseum-Unterseite mit Level-System', datum: '2026-04-27T12:00:00', url: 'kolosseum.html' },
            { titel: 'Quizze ohne Login spielbar', datum: '2026-04-25T12:00:00', url: 'stilmittel-quiz.html' },
        ];
        return Promise.resolve(eintraege.slice(0, 3).map(function (e) {
            return {
                icon: '🛠️', kat: 'Neue Funktion',
                titel: e.titel, meta: 'Lernkolosseum',
                datum: e.datum, url: e.url, nurDatum: true
            };
        }));
    }

    /* ---- Kompaktes Spalten-Rendering ---- */

    function render(gruppen) {
        var container = document.getElementById('win-tabelle');
        if (!container) return;

        var hatInhalte = Object.values(gruppen).some(function (arr) { return arr.length > 0; });
        if (!hatInhalte) {
            container.innerHTML = '<p class="win-leer">Noch keine Neuigkeiten vorhanden.</p>';
            return;
        }

        var reihenfolge = ['Neue Funktion', 'Quiz-Bestleistung', 'Avatar-Aufstieg', 'Neuer Gladiator', 'Materialien', 'Blog'];

        var cols = reihenfolge.map(function (kat) {
            var items = gruppen[kat] || [];
            if (!items.length) return '';

            var itemsHtml = items.map(function (item) {
                return '<a href="' + esc(item.url) + '" class="win-item">'
                    + '<span class="win-item-titel">' + item.titel + '</span>'
                    + (item.meta ? '<span class="win-item-meta">' + esc(item.meta) + '</span>' : '')
                    + '<span class="win-item-datum">' + formatDatum(item.datum, item.nurDatum) + '</span>'
                    + '</a>';
            }).join('');

            return '<div class="win-col">'
                + '<div class="win-col-header">'
                + '<span class="win-col-icon" aria-hidden="true">' + esc(items[0].icon) + '</span>'
                + '<span class="win-col-label">' + esc(kat) + '</span>'
                + '</div>'
                + itemsHtml
                + '</div>';
        }).join('');

        container.innerHTML = '<div class="win-grid">' + cols + '</div>';
    }

    /* ---- Gruppieren nach Kategorie ---- */

    function gruppieren(alle) {
        var gruppen = {};
        alle.forEach(function (item) {
            if (!gruppen[item.kat]) gruppen[item.kat] = [];
            gruppen[item.kat].push(item);
        });
        return gruppen;
    }

    /* ---- Start ---- */

    function laden() {
        Promise.all([
            ladeEntwicklungen(),
            ladeQuizBestenliste(),
            ladeAvataraufstiege(),
            ladeLetzterSpitzname(),
            ladeMaterialien(),
            ladeBlogbeitraege()
        ]).then(function (ergebnisse) {
            var alle = [].concat.apply([], ergebnisse);
            render(gruppieren(alle));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            laden();
            setInterval(laden, 60000);
        });
    } else {
        laden();
        setInterval(laden, 60000);
    }
})();
