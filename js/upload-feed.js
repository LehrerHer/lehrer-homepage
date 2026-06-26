/* ============================================================
   UPLOAD-FEED – Chronologische Übersicht aller Materialien
   Quellen: inhalte.json + Kolosseum-API /api/materials
   ============================================================ */

(function () {
    'use strict';

    var KOLOSSEUM_API = 'https://kolosseum.lehrer-herrmann.de';
    var SEITE_LIMIT   = 10;

    var alleItems  = [];
    var aktivTyp   = 'alle';
    var gezeigt    = 0;

    /* ---- Typ-Erkennung für inhalte.json (kein typ-Feld) ---- */
    function erkenneTyp(item) {
        var t = (item.titel || '') + ' ' + (item.url || '') + ' ' + (item.beschreibung || '');
        var tl = t.toLowerCase();
        if (tl.indexOf('quiz') !== -1) return 'Quiz';
        if (tl.indexOf('rätsel') !== -1 || tl.indexOf('raetsel') !== -1 || tl.indexOf('rebus') !== -1) return 'Rätsel';
        if (tl.indexOf('arbeitsblatt') !== -1 || tl.indexOf('lückentext') !== -1) return 'Arbeitsblatt';
        if (tl.indexOf('ppp') !== -1 || tl.indexOf('präsentation') !== -1 || tl.indexOf('folien') !== -1) return 'Präsentation';
        return 'Material';
    }

    /* ---- Fach-Label aus seite-Feld ---- */
    var FACH_LABEL = {
        deutsch: '📖 Deutsch', geschichte: '🏛️ Geschichte', wipo: '💼 WiPo',
        informatik: '💻 Informatik', mathe: '➗ Mathe', englisch: '🇬🇧 Englisch',
        sport: '⚽ Sport', biologie: '🌿 Biologie', chemie: '🧪 Chemie',
        physik: '⚛️ Physik', musik: '🎵 Musik', erdkunde: '🗺️ Erdkunde',
        'werte-normen': '⚖️ Werte & Normen',
        'das-parfum': '📖 Deutsch', 'theaterprojekt-9': '🎭 Deutsch',
        'faecheruebergreifend': '🔀 Fächerübergreifend', andere: '📋 Sonstiges'
    };

    function fachLabel(seite) {
        if (!seite) return '';
        return FACH_LABEL[seite] || ('📋 ' + seite.charAt(0).toUpperCase() + seite.slice(1));
    }

    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatDatum(isoStr) {
        if (!isoStr) return '';
        try {
            var d = new Date(isoStr.length <= 10 ? isoStr + 'T00:00:00' : isoStr);
            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return String(isoStr).slice(0, 10); }
    }

    /* ---- Daten laden ---- */

    function ladeInhalteJson() {
        return fetch('inhalte.json?t=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : { materialien: [] }; })
            .then(function (d) {
                return (d.materialien || []).map(function (m) {
                    return {
                        titel:      m.titel || '(ohne Titel)',
                        beschreibung: m.beschreibung || '',
                        icon:       m.icon || '📄',
                        url:        m.url || '#',
                        datum:      m.datum || '',
                        typ:        erkenneTyp(m),
                        fach:       fachLabel(m.seite),
                        quelle:     'json'
                    };
                });
            })
            .catch(function () { return []; });
    }

    function ladeApiMaterialien() {
        return fetch(KOLOSSEUM_API + '/api/materials', { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (d) {
                if (!Array.isArray(d)) return [];
                return d.map(function (m) {
                    return {
                        titel:      m.titel || '(ohne Titel)',
                        beschreibung: m.beschreibung || '',
                        icon:       m.typ === 'Quiz' ? '⚔️' : m.typ === 'Arbeitsblatt' ? '📝' : '📄',
                        url:        m.datei_url ? (KOLOSSEUM_API + m.datei_url) : '#',
                        datum:      (m.erstellt_am || m.created_at || '').slice(0, 10),
                        typ:        m.typ || 'Material',
                        fach:       fachLabel(m.fach),
                        quelle:     'api'
                    };
                });
            })
            .catch(function () { return []; });
    }

    /* ---- Rendering ---- */

    var TYP_BADGE = {
        'Arbeitsblatt':  { cls: 'uf-typ-ab',     label: 'Arbeitsblatt' },
        'Quiz':          { cls: 'uf-typ-quiz',    label: '⚔️ Quiz'       },
        'Rätsel':        { cls: 'uf-typ-raetsel', label: '🧩 Rätsel'    },
        'Präsentation':  { cls: 'uf-typ-ppp',     label: '📊 Präsentation' },
        'Material':      { cls: 'uf-typ-mat',     label: 'Material'     }
    };

    function typBadge(typ) {
        var b = TYP_BADGE[typ] || TYP_BADGE['Material'];
        return '<span class="uf-typ ' + b.cls + '">' + esc(b.label) + '</span>';
    }

    function renderItem(item) {
        var isExternal = item.url.indexOf('http') === 0 && item.url.indexOf('kolosseum.lehrer-herrmann.de') !== -1;
        var target = isExternal ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + esc(item.url) + '" class="uf-item"' + target + '>'
            + '<div class="uf-datum">' + esc(formatDatum(item.datum)) + '</div>'
            + '<div class="uf-icon" aria-hidden="true">' + esc(item.icon) + '</div>'
            + '<div class="uf-content">'
            +   '<div class="uf-titel">' + esc(item.titel) + '</div>'
            +   (item.beschreibung ? '<div class="uf-beschr">' + esc(item.beschreibung) + '</div>' : '')
            + '</div>'
            + '<div class="uf-badges">'
            +   typBadge(item.typ)
            +   (item.fach ? '<span class="uf-fach">' + esc(item.fach) + '</span>' : '')
            + '</div>'
            + '</a>';
    }

    function gefiltert() {
        if (aktivTyp === 'alle') return alleItems;
        return alleItems.filter(function (i) { return i.typ === aktivTyp; });
    }

    function renderListe() {
        var liste  = document.getElementById('uf-liste');
        var btnBox = document.getElementById('uf-mehr');
        if (!liste) return;

        var items = gefiltert();
        if (!items.length) {
            liste.innerHTML = '<p class="uf-leer">Keine Einträge gefunden.</p>';
            if (btnBox) btnBox.style.display = 'none';
            return;
        }

        var sichtbar = items.slice(0, gezeigt);
        liste.innerHTML = sichtbar.map(renderItem).join('');

        if (btnBox) {
            btnBox.style.display = gezeigt < items.length ? '' : 'none';
        }
    }

    function mehrLaden() {
        gezeigt = Math.min(gezeigt + SEITE_LIMIT, gefiltert().length + SEITE_LIMIT);
        renderListe();
    }

    /* ---- Filter-Buttons ---- */

    function initFilter() {
        var container = document.getElementById('uf-filter');
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest('.uf-filter-btn');
            if (!btn) return;
            aktivTyp = btn.dataset.typ || 'alle';
            gezeigt  = SEITE_LIMIT;
            container.querySelectorAll('.uf-filter-btn').forEach(function (b) {
                b.classList.toggle('aktiv', b === btn);
            });
            renderListe();
        });
    }

    /* ---- Start ---- */

    function laden() {
        Promise.all([ladeInhalteJson(), ladeApiMaterialien()])
            .then(function (quellen) {
                var alle = [].concat.apply([], quellen);

                /* Deduplizieren nach URL (API-Upload = JSON-Eintrag möglich) */
                var urls = {};
                alleItems = alle.filter(function (item) {
                    var key = item.url.replace(/^https?:\/\/[^/]+/, '').toLowerCase();
                    if (urls[key]) return false;
                    urls[key] = true;
                    return true;
                });

                /* Neueste zuerst */
                alleItems.sort(function (a, b) {
                    return (b.datum || '').localeCompare(a.datum || '');
                });

                gezeigt = SEITE_LIMIT;
                renderListe();
            });
    }

    function init() {
        var mehrBtn = document.getElementById('uf-mehr-btn');
        if (mehrBtn) mehrBtn.addEventListener('click', mehrLaden);
        initFilter();
        laden();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
