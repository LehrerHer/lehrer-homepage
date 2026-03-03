/* ============================================================
   BLOG – Rendering und Interaktion
   Jan Herrmann · Oberschule Spelle

   Lädt Beiträge aus Supabase (wenn konfiguriert) oder zeigt
   die Beispieldaten aus blog-daten.js (Fallback).
   ============================================================ */

(function () {
    'use strict';

    /* ---- Hilfsfunktionen ---- */

    function fachKlasse(fach) {
        const map = {
            'Deutsch':        'fach-deutsch',
            'Geschichte':     'fach-geschichte',
            'WiPo':           'fach-wipo',
            'Informatik':     'fach-informatik',
            'Werte & Normen': 'fach-werte-normen',
            'AG/Projekte':    'fach-ag-projekte'
        };
        return map[fach] || 'fach-sonstige';
    }

    function dateiTypInfo(typ) {
        const map = {
            'pdf':      { icon: '📄', label: 'PDF-Dokument' },
            'bild':     { icon: '🖼️', label: 'Bild / Foto' },
            'text':     { icon: '✍️', label: 'Text / Gedicht' },
            'sonstige': { icon: '📎', label: 'Datei' }
        };
        return map[typ] || map['sonstige'];
    }

    function datumFormatieren(isoString) {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('de-DE', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
        } catch (_) { return isoString; }
    }

    function escape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ---- Beiträge von Supabase laden ---- */

    async function beitraegeLaden() {
        /* Wenn Supabase konfiguriert → live Daten laden */
        if (typeof SUPABASE_KONFIGURIERT !== 'undefined' && SUPABASE_KONFIGURIERT) {
            const antwort = await fetch(
                `${SUPABASE_URL}/rest/v1/blog_beitraege?select=*&order=datum.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'apikey':        SUPABASE_KEY
                    }
                }
            );

            if (!antwort.ok) {
                throw new Error(`Supabase: ${antwort.status}`);
            }

            const daten = await antwort.json();

            /* Supabase-Spalten → internes Format */
            return daten.map(function (b) {
                const istBild = b.datei_typ === 'bild';
                return {
                    id:           b.id,
                    titel:        b.titel,
                    autor:        b.autor,
                    klasse:       b.klasse,
                    fach:         b.fach,
                    datum:        b.datum ? b.datum.slice(0, 10) : '',
                    beschreibung: b.beschreibung || '',
                    datei:        b.datei_url || '',
                    dateiTyp:     b.datei_typ || 'sonstige',
                    vorschaubild: istBild ? b.datei_url : null,
                    textinhalt:   null
                };
            });
        }

        /* Fallback: statische Beispieldaten aus blog-daten.js */
        if (typeof BLOG_BEITRAEGE !== 'undefined') {
            return BLOG_BEITRAEGE.slice().sort(function (a, b) {
                return new Date(b.datum) - new Date(a.datum);
            });
        }

        return [];
    }

    /* ---- Karte erstellen ---- */

    function karteErstellen(beitrag) {
        const artikel  = document.createElement('article');
        artikel.className = 'blog-karte';
        artikel.setAttribute('role', 'listitem');
        artikel.dataset.fach   = beitrag.fach   || '';
        artikel.dataset.klasse = beitrag.klasse  || '';
        artikel.dataset.typ    = beitrag.dateiTyp || '';

        const typInfo = dateiTypInfo(beitrag.dateiTyp);

        const vorschauHTML = (beitrag.dateiTyp === 'bild' && beitrag.vorschaubild)
            ? `<img class="blog-karte-vorschau"
                    src="${escape(beitrag.vorschaubild)}"
                    alt="Vorschau: ${escape(beitrag.titel)}"
                    loading="lazy">`
            : `<div class="blog-karte-vorschau-placeholder" aria-hidden="true">
                    ${typInfo.icon}
               </div>`;

        let btnLabel = 'Beitrag ansehen →';
        if (beitrag.dateiTyp === 'pdf'  && beitrag.datei) btnLabel = 'PDF öffnen →';
        if (beitrag.dateiTyp === 'bild')                  btnLabel = 'Bild ansehen →';
        if (beitrag.dateiTyp === 'text')                  btnLabel = 'Text lesen →';

        artikel.innerHTML = `
            ${vorschauHTML}
            <div class="blog-karte-body">
                <span class="blog-fach-badge ${fachKlasse(beitrag.fach)}">${escape(beitrag.fach)}</span>
                <h3>${escape(beitrag.titel)}</h3>
                <div class="blog-karte-meta">
                    <span>👤 ${escape(beitrag.autor)}</span>
                    <span>🏫 Klasse ${escape(beitrag.klasse)}</span>
                    <span>📅 ${datumFormatieren(beitrag.datum)}</span>
                </div>
                <p class="blog-karte-beschreibung">${escape(beitrag.beschreibung)}</p>
                <div class="blog-karte-footer">
                    <span class="blog-karte-typ">${typInfo.icon} ${typInfo.label}</span>
                    <button class="blog-karte-btn" data-id="${beitrag.id}"
                            aria-label="${escape(btnLabel)}: ${escape(beitrag.titel)}">
                        ${btnLabel}
                    </button>
                </div>
            </div>`;

        artikel.querySelector('.blog-karte-btn')
               .addEventListener('click', function () { detailOeffnen(beitrag); });

        return artikel;
    }

    /* ---- Lightbox ---- */

    const lightbox         = document.getElementById('lightbox');
    const lightboxInhalt   = document.getElementById('lightbox-inhalt');
    const lightboxSchliess = document.getElementById('lightbox-schliessen');

    function detailOeffnen(beitrag) {
        if (!lightbox || !lightboxInhalt) return;

        const metaText = `${escape(beitrag.autor)} · Klasse ${escape(beitrag.klasse)} · ${datumFormatieren(beitrag.datum)}`;
        const badge    = `<span class="blog-fach-badge ${fachKlasse(beitrag.fach)}">${escape(beitrag.fach)}</span>`;

        if (beitrag.dateiTyp === 'text' && beitrag.textinhalt) {
            lightboxInhalt.innerHTML = `
                <div class="lightbox-text-header">
                    ${badge}
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                </div>
                <div class="lightbox-textinhalt">${escape(beitrag.textinhalt)}</div>`;

        } else if (beitrag.dateiTyp === 'bild' && beitrag.datei) {
            lightboxInhalt.innerHTML = `
                <div class="lightbox-bild-header">
                    ${badge}
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                    ${beitrag.beschreibung ? `<p style="margin-top:8px;font-size:.93rem;color:var(--farbe-text-hell)">${escape(beitrag.beschreibung)}</p>` : ''}
                </div>
                <img class="lightbox-bild" src="${escape(beitrag.datei)}" alt="${escape(beitrag.titel)}">
                <br>
                <a href="${escape(beitrag.datei)}" download class="lightbox-download">⬇ Bild herunterladen</a>`;

        } else if (beitrag.datei) {
            lightboxInhalt.innerHTML = `
                <div class="lightbox-text-header">
                    ${badge}
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                    ${beitrag.beschreibung ? `<p style="margin-top:12px;font-size:.95rem;line-height:1.7">${escape(beitrag.beschreibung)}</p>` : ''}
                </div>
                <a href="${escape(beitrag.datei)}" target="_blank" rel="noopener" class="lightbox-download">
                    📄 Datei öffnen / herunterladen
                </a>`;

        } else {
            lightboxInhalt.innerHTML = `
                <div class="lightbox-text-header">
                    ${badge}
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                </div>
                <p style="font-size:.97rem;line-height:1.7">${escape(beitrag.beschreibung)}</p>`;
        }

        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        lightboxSchliess && lightboxSchliess.focus();
    }

    function detailSchliessen() {
        if (!lightbox) return;
        lightbox.hidden = true;
        document.body.style.overflow = '';
    }

    lightboxSchliess && lightboxSchliess.addEventListener('click', detailSchliessen);
    lightbox && lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) detailSchliessen();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightbox && !lightbox.hidden) detailSchliessen();
    });

    /* ---- Filter-Logik ---- */

    const filterFach      = document.getElementById('filter-fach');
    const filterJahrgang  = document.getElementById('filter-jahrgang');
    const filterKlasse    = document.getElementById('filter-klasse');
    const filterTyp       = document.getElementById('filter-typ');
    const filterZurueck   = document.getElementById('filter-zurueck');

    function filterAnwenden() {
        const gewFach     = filterFach     ? filterFach.value     : '';
        const gewJahrgang = filterJahrgang ? filterJahrgang.value : '';
        const gewKlasse   = filterKlasse   ? filterKlasse.value   : '';
        const gewTyp      = filterTyp      ? filterTyp.value      : '';

        const aktiv = !!(gewFach || gewJahrgang || gewKlasse || gewTyp);
        filterZurueck && filterZurueck.classList.toggle('sichtbar', aktiv);

        let sichtbar = 0;
        document.querySelectorAll('.blog-karte').forEach(function (k) {
            /* k.dataset.klasse enthält kombinierten Wert, z. B. "7c" */
            const kJahrgang = k.dataset.klasse ? k.dataset.klasse.slice(0, -1) : '';
            const kBuchstabe = k.dataset.klasse ? k.dataset.klasse.slice(-1)   : '';
            const passt =
                (!gewFach     || k.dataset.fach === gewFach)   &&
                (!gewJahrgang || kJahrgang       === gewJahrgang) &&
                (!gewKlasse   || kBuchstabe       === gewKlasse) &&
                (!gewTyp      || k.dataset.typ    === gewTyp);
            k.style.display = passt ? '' : 'none';
            if (passt) sichtbar++;
        });

        const leerMsg  = document.getElementById('blog-leer');
        const anzahlEl = document.getElementById('blog-anzahl');
        if (leerMsg)  leerMsg.hidden = sichtbar > 0;
        if (anzahlEl) anzahlEl.textContent = sichtbar === 0 ? ''
            : sichtbar === 1 ? '1 Beitrag' : sichtbar + ' Beiträge';
    }

    filterFach     && filterFach.addEventListener('change', filterAnwenden);
    filterJahrgang && filterJahrgang.addEventListener('change', filterAnwenden);
    filterKlasse   && filterKlasse.addEventListener('change', filterAnwenden);
    filterTyp      && filterTyp.addEventListener('change', filterAnwenden);
    filterZurueck  && filterZurueck.addEventListener('click', function () {
        if (filterFach)     filterFach.value     = '';
        if (filterJahrgang) filterJahrgang.value = '';
        if (filterKlasse)   filterKlasse.value   = '';
        if (filterTyp)      filterTyp.value      = '';
        filterAnwenden();
    });

    /* ---- Hauptfunktion: Beiträge laden und rendern ---- */

    async function blogRendern() {
        const grid     = document.getElementById('blog-grid');
        const leerMsg  = document.getElementById('blog-leer');
        const anzahlEl = document.getElementById('blog-anzahl');
        if (!grid) return;

        /* Ladezustand anzeigen */
        if (anzahlEl) anzahlEl.textContent = 'Beiträge werden geladen …';

        let beitraege = [];
        try {
            beitraege = await beitraegeLaden();
        } catch (fehler) {
            console.error('Blog-Ladefehler:', fehler);
            if (anzahlEl) anzahlEl.textContent = 'Beiträge konnten nicht geladen werden.';
            return;
        }

        if (beitraege.length === 0) {
            if (leerMsg)  leerMsg.hidden  = false;
            if (anzahlEl) anzahlEl.textContent = '';
            return;
        }

        beitraege.forEach(function (b) { grid.appendChild(karteErstellen(b)); });
        filterAnwenden();

        /* Hinweis wenn Beispieldaten angezeigt werden */
        if (typeof SUPABASE_KONFIGURIERT !== 'undefined' && !SUPABASE_KONFIGURIERT) {
            const hinweis = document.createElement('p');
            hinweis.style.cssText = 'text-align:center;font-size:.82rem;color:var(--farbe-text-hell);margin-top:32px;';
            hinweis.textContent = '⚙️ Beispieldaten – Supabase noch nicht eingerichtet (js/supabase-config.js).';
            grid.insertAdjacentElement('afterend', hinweis);
        }
    }

    blogRendern();

}());
