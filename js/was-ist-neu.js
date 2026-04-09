/* ============================================================
   WAS IST NEU? – Automatische Neuigkeiten-Übersicht
   Jan Herrmann · Oberschule Spelle

   Kombiniert bis zu 3 aktuelle Einträge aus:
     1. Neue Materialien   (inhalte.json)
     2. Neue Blogbeiträge  (Supabase blog_beitraege)
     3. Quiz-Bestenliste   (Supabase quiz_bestenliste)
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

    /* ---- Hilfsfunktionen ---- */

    function escape(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatDatum(isoStr, nurDatum) {
        if (!isoStr) return '–';
        try {
            var d = new Date(isoStr);
            var datumTeil = d.toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            if (nurDatum) return datumTeil;
            return datumTeil + '<br><span class="win-uhrzeit">'
                + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                + ' Uhr</span>';
        } catch (e) { return String(isoStr); }
    }

    /* ---- Datenquellen ---- */

    function ladeMaterialien() {
        return fetch('inhalte.json')
            .then(function (r) { return r.ok ? r.json() : { materialien: [] }; })
            .then(function (d) {
                var items = (d.materialien || []).slice()
                    .sort(function (a, b) { return (b.datum || '').localeCompare(a.datum || ''); })
                    .slice(0, 3);
                return items.map(function (m) {
                    return {
                        typ:    'material',
                        icon:   '📥',
                        kat:    'Neues Material',
                        titel:  m.titel,
                        meta:   m.beschreibung || '',
                        datum:  m.datum ? m.datum + 'T00:00:00' : null,
                        url:    m.url || 'index.html#materialien',
                        nurDatum: true
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeBlogbeitraege() {
        if (typeof SUPABASE_KONFIGURIERT === 'undefined' || !SUPABASE_KONFIGURIERT) {
            return Promise.resolve([]);
        }
        var url = SUPABASE_URL
            + '/rest/v1/blog_beitraege'
            + '?select=titel,autor,klasse,fach,datum'
            + '&order=datum.desc&limit=3';
        return fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'apikey':        SUPABASE_KEY
            }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (d) {
            return d.map(function (b) {
                return {
                    typ:   'blog',
                    icon:  '✍️',
                    kat:   'Blogbeitrag',
                    titel: b.titel,
                    meta:  (b.autor || '') + (b.klasse ? ' · Kl. ' + b.klasse : ''),
                    datum: b.datum,
                    url:   'blog.html'
                };
            });
        })
        .catch(function () { return []; });
    }

    function ladeQuizBestenliste() {
        if (typeof SUPABASE_KONFIGURIERT === 'undefined' || !SUPABASE_KONFIGURIERT) {
            return Promise.resolve([]);
        }
        var url = SUPABASE_URL
            + '/rest/v1/quiz_bestenliste'
            + '?select=name,quiz,modus,prozent,datum'
            + '&order=datum.desc&limit=3';
        return fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'apikey':        SUPABASE_KEY
            }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (d) {
            return d.map(function (e) {
                var quizLabel = QUIZ_LABELS[e.quiz] || e.quiz;
                var modLabel  = QUIZ_LABELS[e.modus] || e.modus;
                return {
                    typ:   'quiz',
                    icon:  '🏆',
                    kat:   'Quiz-Bestenliste',
                    titel: (e.name || '???') + ' – ' + e.prozent + '\u00a0%',
                    meta:  quizLabel + (modLabel ? ' · ' + modLabel : ''),
                    datum: e.datum,
                    url:   QUIZ_URLS[e.quiz] || 'index.html#quizze'
                };
            });
        })
        .catch(function () { return []; });
    }

    /* ---- Rendern ---- */

    function render(alle) {
        var container = document.getElementById('win-tabelle');
        if (!container) return;

        if (alle.length === 0) {
            container.innerHTML = '<p class="win-leer">Noch keine Neuigkeiten vorhanden.</p>';
            return;
        }

        /* Nach Datum absteigend sortieren */
        alle.sort(function (a, b) {
            return new Date(b.datum || 0) - new Date(a.datum || 0);
        });

        var zeilen = alle.map(function (item) {
            return '<tr>'
                + '<td class="win-kat"><span class="win-icon" aria-hidden="true">'
                +   escape(item.icon) + '</span>'
                +   '<span class="win-kat-text">' + escape(item.kat) + '</span>'
                +   (item.meta ? '<br><span class="win-meta">' + escape(item.meta) + '</span>' : '')
                + '</td>'
                + '<td class="win-titel">'
                +   '<a href="' + escape(item.url) + '">' + escape(item.titel) + '</a>'
                + '</td>'
                + '<td class="win-datum">'
                +   formatDatum(item.datum, item.nurDatum)
                + '</td>'
                + '</tr>';
        }).join('');

        container.innerHTML =
            '<table class="win-tabelle" role="table" aria-label="Neuigkeiten">'
            + '<thead>'
            + '<tr>'
            + '<th scope="col">Kategorie</th>'
            + '<th scope="col">Inhalt</th>'
            + '<th scope="col">Datum&nbsp;/&nbsp;Uhrzeit</th>'
            + '</tr>'
            + '</thead>'
            + '<tbody>' + zeilen + '</tbody>'
            + '</table>';
    }

    /* ---- Start ---- */

    function laden() {
        Promise.all([
            ladeMaterialien(),
            ladeBlogbeitraege(),
            ladeQuizBestenliste()
        ]).then(function (ergebnisse) {
            var alle = ergebnisse[0].concat(ergebnisse[1]).concat(ergebnisse[2]);
            render(alle);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', laden);
    } else {
        laden();
    }
})();
