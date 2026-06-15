/* ============================================================
   WAS IST NEU? – Kompakte Neuigkeiten-Übersicht (je 5 pro Kategorie)
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
        stilmittel:            'stilmittel-quiz.html',
        literaturwissenschaft: 'literaturwissenschaft_quiz_v2.html',
        rechtschreib:          'rechtschreibquiz.html',
        deutsch:               'materialien/deutsch_seki_quiz_2026-05.html',
        erdkunde:              'fach-erdkunde.html'
    };
    var QUIZ_LABELS = {
        stilmittel:            'Stilmittel-Quiz',
        literaturwissenschaft: 'Literaturwissenschaft-Quiz',
        rechtschreib:          'Rechtschreib-Quiz',
        deutsch:               'Deutsch-Quiz (Sek I)',
        erdkunde:              'Erdkunde-Kartenquiz',
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
                    .slice(0, 5)
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
        return fetch(API + '/api/blog?limit=5')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 5).map(function (b) {
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
        return fetch(API + '/api/leaderboard/alle?limit=5')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 5).map(function (e) {
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
        return fetch(API + '/api/public/recent-gladiatoren?limit=5')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 5).map(function (g) {
                    return {
                        icon: g.level_icon || '⚔️', kat: 'Avatar-Aufstieg',
                        titel: esc(g.nickname) + ' → ' + esc(g.level_name),
                        meta:  g.xp + ' XP',
                        datum: g.last_active,
                        url:   'kolosseum/public/rangliste.html'
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeNeueGladiatoren() {
        return fetch(API + '/api/public/neue-gladiatoren?limit=5')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                if (!Array.isArray(d)) return [];
                return d.slice(0, 5).map(function (g) {
                    return {
                        icon: '🪖', kat: 'Neuer Gladiator',
                        titel: esc(g.nick),
                        meta: 'Neu registriert',
                        datum: g.created_at,
                        url: 'kolosseum/public/rangliste.html'
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeEntwicklungen() {
        // Quelle: neuigkeiten.json (leicht pflegbar – neueste Einträge oben).
        return fetch('neuigkeiten.json?t=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : { funktionen: [] }; })
            .then(function (d) {
                return (d.funktionen || []).slice()
                    .sort(function (a, b) { return (b.datum || '').localeCompare(a.datum || ''); })
                    .slice(0, 5)
                    .map(function (e) {
                        var datum = e.datum && e.datum.length <= 10 ? e.datum + 'T00:00:00' : e.datum;
                        return {
                            icon: '🛠️', kat: 'Neue Funktion',
                            titel: e.titel, meta: e.meta || 'Update',
                            datum: datum, url: e.url || 'index.html#was-ist-neu',
                            nurDatum: true
                        };
                    });
            })
            .catch(function () { return []; });
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
            ladeNeueGladiatoren(),
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
