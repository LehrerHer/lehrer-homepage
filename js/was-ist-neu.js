/* ============================================================
   WAS IST NEU? – eine kurze, datierte Liste (Stand 2026-11)
   Jan Herrmann

   Quellen (zusammengeführt, neueste zuerst, max. MAX_EINTRAEGE,
   je Kategorie max. MAX_JE_KATEGORIE):
     - Neue Funktion        (neuigkeiten.json – ohne "intern": true / meta "Technik")
     - Neue Arbeitsblätter, Quizze, Materialien (inhalte.json + Kolosseum-Uploads)
     - Blog, Quiz-Bestleistung, Avatar-Aufstieg, Neuer Gladiator (Kolosseum API)
   Gibt es nichts, wird der Abschnitt ausgeblendet.
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

    var MAX_EINTRAEGE    = 8;
    var MAX_JE_KATEGORIE = 3;

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

    /* Typ-Erkennung für inhalte.json-Einträge (dort gibt es kein typ-Feld) */
    function erkenneTyp(m) {
        var t = ((m.titel || '') + ' ' + (m.url || '') + ' ' + (m.beschreibung || '')).toLowerCase();
        if (t.indexOf('quiz') !== -1 || t.indexOf('rätsel') !== -1 || t.indexOf('raetsel') !== -1 || t.indexOf('rebus') !== -1) return 'Quiz';
        if (t.indexOf('arbeitsblatt') !== -1 || t.indexOf('lückentext') !== -1) return 'Arbeitsblatt';
        return 'Material';
    }

    var MAT_KATEGORIE = {
        'Arbeitsblatt': { kat: 'Neue Arbeitsblätter', icon: '📝' },
        'Quiz':         { kat: 'Neue Quizze',         icon: '⚔️' },
        'Material':     { kat: 'Neue Materialien',    icon: '📥' }
    };

    function materialItem(typ, titel, beschr, datum, url) {
        var k = MAT_KATEGORIE[typ] || MAT_KATEGORIE['Material'];
        return {
            icon: k.icon, kat: k.kat,
            titel: esc(titel), meta: typ + (beschr && beschr.length < 40 ? ' · ' + beschr : ''),
            datum: datum, url: url, nurDatum: true,
            schluessel: String(url).replace(/^https?:\/\/[^/]+/, '').toLowerCase()
        };
    }

    function ladeMaterialienJson() {
        return fetch('inhalte.json?t=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : { materialien: [] }; })
            .then(function (d) {
                return (d.materialien || []).map(function (m) {
                    return materialItem(erkenneTyp(m), m.titel, m.beschreibung,
                        m.datum ? m.datum + 'T00:00:00' : null, m.url || 'index.html#was-ist-neu');
                });
            })
            .catch(function () { return []; });
    }

    /* Über „Material hochladen" im Admin hochgeladene Dateien (Typ: Arbeitsblatt / Material / Quiz) */
    function ladeMaterialienUploads() {
        return fetch(API + '/api/materials')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                if (!Array.isArray(d)) return [];
                return d.map(function (m) {
                    return materialItem(m.typ, m.titel, m.fach || '',
                        (m.erstellt_am || '').replace(' ', 'T') || null,
                        m.datei_url ? API + m.datei_url : 'index.html#was-ist-neu');
                });
            })
            .catch(function () { return []; });
    }

    function ladeMaterialien() {
        return Promise.all([ladeMaterialienJson(), ladeMaterialienUploads()]).then(function (q) {
            var gesehen = {};
            return [].concat(q[0], q[1]).filter(function (i) {
                if (gesehen[i.schluessel]) return false;
                gesehen[i.schluessel] = true;
                return true;
            });
        });
    }

    function ladeBlogbeitraege() {
        return fetch(API + '/api/blog?limit=5')
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                return d.slice(0, 5).map(function (b) {
                    return {
                        icon: '✍️', kat: 'Blog',
                        titel: esc(b.titel),
                        meta: 'Blog' + (b.autor ? ' · ' + b.autor : '') + (String(b.klasse || '').replace(/[^0-9]/g, '') ? ' \xB7 Jg. ' + String(b.klasse).replace(/[^0-9]/g, '') : ''),
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
                        titel: esc(g.nickname) + ' steigt auf: ' + esc(g.level_name),
                        meta:  'Gladiatorenkämpfe · ' + g.xp + ' XP',
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
                        titel: esc(g.nick) + ' ist neu in der Arena',
                        meta: 'Gladiatorenkämpfe',
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
                return (d.funktionen || [])
                    .filter(function (e) { return !e.intern && e.meta !== 'Technik'; })   // Entwickler-Protokoll ausblenden
                    .map(function (e) {
                        var datum = e.datum && e.datum.length <= 10 ? e.datum + 'T00:00:00' : e.datum;
                        return {
                            icon: '🛠️', kat: 'Neue Funktion',
                            titel: esc(e.titel), meta: e.meta || '',
                            datum: datum, url: e.url || 'index.html#was-ist-neu',
                            nurDatum: true
                        };
                    });
            })
            .catch(function () { return []; });
    }

    /* ---- Rendering: eine datierte Liste ---- */

    function isoTag(datum) {
        try { return new Date(datum).toISOString().slice(0, 10); } catch (e) { return ''; }
    }

    function render(alle) {
        var container = document.getElementById('win-tabelle');
        var abschnitt = document.getElementById('was-ist-neu');
        if (!container) return;

        var proKategorie = {};
        var eintraege = alle
            .filter(function (i) { return i && i.titel && i.datum; })
            .sort(function (a, b) { return String(b.datum).localeCompare(String(a.datum)); })
            .filter(function (i) {
                proKategorie[i.kat] = (proKategorie[i.kat] || 0) + 1;
                return proKategorie[i.kat] <= MAX_JE_KATEGORIE;
            })
            .slice(0, MAX_EINTRAEGE);

        if (!eintraege.length) {                    // nichts Neues → Abschnitt ausblenden
            if (abschnitt) abschnitt.hidden = true;
            return;
        }
        if (abschnitt) abschnitt.hidden = false;

        container.innerHTML = '<ol class="nb-neu-liste">' + eintraege.map(function (item) {
            return '<li>'
                + '<time datetime="' + esc(isoTag(item.datum)) + '">' + formatDatum(item.datum, true) + '</time>'
                + '<span><a href="' + esc(item.url) + '">' + item.titel + '</a>'
                + (item.meta ? '<small>' + esc(item.meta) + '</small>' : '')
                + '</span></li>';
        }).join('') + '</ol>';
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
            render(alle);
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
