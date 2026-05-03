/* ============================================================
   WAS IST NEU? – Kompakte Neuigkeiten-Übersicht (je 2 pro Kategorie)
   Jan Herrmann · Oberschule Spelle

   Kategorien:
     1. Neue Funktionen  (manuell gepflegt)
     2. Quiz-Bestenliste (Kolosseum API)
     3. Avataraufstiege  (Kolosseum API)
     4. Neue Materialien (inhalte.json)
     5. Blogbeiträge     (Kolosseum API)

   Extra-Block:
     → Letzte 5 Gladiatoren mit XP-Aktivität (Kolosseum API)
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
        return fetch('inhalte.json')
            .then(function (r) { return r.ok ? r.json() : { materialien: [] }; })
            .then(function (d) {
                return (d.materialien || []).slice()
                    .sort(function (a, b) { return (b.datum || '').localeCompare(a.datum || ''); })
                    .slice(0, 2)
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
        return fetch(API + '/api/blog?limit=2')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 2).map(function (b) {
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
        return fetch(API + '/api/leaderboard/alle?limit=2')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 2).map(function (e) {
                    return {
                        icon: '🏆', kat: 'Quiz-Bestleistung',
                        titel: esc(e.name || '???') + ' – ' + e.prozent + ' %',
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

    function ladeEntwicklungen() {
        /* -------------------------------------------------------
           Neue Einträge oben ergänzen, älteste unten lassen.
           Es werden nur die ersten 2 angezeigt.
           ------------------------------------------------------- */
        var eintraege = [
            { titel: 'Impressum & Datenschutz eingerichtet',           datum: '2026-05-03T12:00:00', url: 'impressum.html' },
            { titel: 'Nutzungshinweise auf Abgabe- & Blog-Formular',   datum: '2026-05-03T11:00:00', url: 'impressum.html#nutzung' },
            { titel: 'GoatCounter Analytics (cookiefrei) eingebunden', datum: '2026-04-30T10:00:00', url: 'datenschutz.html' },
            { titel: 'AB Herrschaft im Mittelalter + KI-Feedback',     datum: '2026-04-29T17:00:00', url: 'ab-herrschaft-mittelalter.html' },
            { titel: 'Kolosseum: Fächer & Materialien + Fortschritt',  datum: '2026-04-29T12:00:00', url: 'kolosseum.html' },
            { titel: 'Arena-Statusleiste auf allen Seiten',            datum: '2026-04-28T12:00:00', url: 'kolosseum.html' },
            { titel: 'Upload-Interface für Lehrkräfte',                datum: '2026-04-27T12:00:00', url: 'lehrer-upload.html' },
            { titel: 'Quizze ohne Login spielbar',                     datum: '2026-04-25T12:00:00', url: 'stilmittel-quiz.html' },
        ];
        return Promise.resolve(eintraege.slice(0, 2).map(function (e) {
            return {
                icon: '🛠️', kat: 'Neue Funktion',
                titel: e.titel, meta: 'Lernkolosseum',
                datum: e.datum, url: e.url, nurDatum: true
            };
        }));
    }

    /* ---- XP-Aktivitätsliste (5 zuletzt aktive Gladiatoren) ---- */

    function ladeXpAktivitaet() {
        return fetch(API + '/api/public/xp-aktivitaet')
            .then(function (r) { return r.ok ? r.json() : []; })
            .catch(function () { return []; });
    }

    /* ---- Rendering ---- */

    function renderGladiatoren(gladiatoren) {
        if (!gladiatoren || !gladiatoren.length) return '';

        var zeilen = gladiatoren.map(function (g, i) {
            var rangBadge = g.rang <= 3
                ? ['🥇', '🥈', '🥉'][g.rang - 1]
                : '#' + g.rang;
            return '<div class="win-gladiator-zeile">'
                + '<span class="win-gladiator-rang">' + rangBadge + '</span>'
                + '<span class="win-gladiator-level" title="' + esc(g.level_name) + '">' + esc(g.level_icon) + '</span>'
                + '<span class="win-gladiator-name">' + esc(g.nickname) + '</span>'
                + '<span class="win-gladiator-level-name">' + esc(g.level_name) + '</span>'
                + '<span class="win-gladiator-xp">' + g.xp + ' XP</span>'
                + '<span class="win-gladiator-datum">' + formatDatum(g.last_active) + '</span>'
                + '</div>';
        }).join('');

        return '<div class="win-gladiatoren-block">'
            + '<div class="win-gladiatoren-header">'
            + '<span>⚔️</span>'
            + '<span>Zuletzt aktive Gladiatoren</span>'
            + '<a href="https://kolosseum.lehrer-herrmann.de/rangliste.html" class="win-gladiatoren-mehr">→ Rangliste</a>'
            + '</div>'
            + '<div class="win-gladiatoren-liste">'
            + '<div class="win-gladiator-kopf">'
            + '<span>Rang</span><span>Lvl</span><span>Name</span><span>Stufe</span>'
            + '<span>XP</span><span>Zuletzt aktiv</span>'
            + '</div>'
            + zeilen
            + '</div>'
            + '</div>';
    }

    function render(gruppen, gladiatoren) {
        var container = document.getElementById('win-tabelle');
        if (!container) return;

        var hatKategorien = Object.keys(gruppen).some(function (k) { return gruppen[k].length > 0; });
        var hatGladiatoren = gladiatoren && gladiatoren.length > 0;

        if (!hatKategorien && !hatGladiatoren) {
            container.innerHTML = '<p class="win-leer">Noch keine Neuigkeiten vorhanden.</p>';
            return;
        }

        var reihenfolge = ['Neue Funktion', 'Quiz-Bestleistung', 'Avatar-Aufstieg', 'Materialien', 'Blog'];

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

        container.innerHTML = (cols ? '<div class="win-grid">' + cols + '</div>' : '')
            + renderGladiatoren(gladiatoren);
    }

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
            ladeMaterialien(),
            ladeBlogbeitraege(),
            ladeXpAktivitaet()
        ]).then(function (ergebnisse) {
            var gladiatoren = ergebnisse[5];
            var kategorien  = [].concat.apply([], ergebnisse.slice(0, 5));
            render(gruppieren(kategorien), gladiatoren);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', laden);
    } else {
        laden();
    }
})();
