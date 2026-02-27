/* ============================================================
   BLOG – Rendering und Interaktion
   Jan Herrmann · Oberschule Spelle

   Dieses Skript liest das Array BLOG_BEITRAEGE aus blog-daten.js
   und rendert die Beitragskarten ins DOM.
   ============================================================ */

(function () {
    'use strict';

    /* ---- Hilfsfunktionen ---- */

    /** Fach-CSS-Klasse ermitteln */
    function fachKlasse(fach) {
        const map = {
            'Deutsch':    'fach-deutsch',
            'Geschichte': 'fach-geschichte',
            'WiPo':       'fach-wipo',
            'Informatik': 'fach-informatik'
        };
        return map[fach] || 'fach-sonstige';
    }

    /** Dateityp-Icon und -Label ermitteln */
    function dateiTypInfo(typ) {
        const map = {
            'pdf':      { icon: '📄', label: 'PDF-Dokument' },
            'bild':     { icon: '🖼️', label: 'Bild / Foto' },
            'text':     { icon: '✍️', label: 'Text / Gedicht' },
            'sonstige': { icon: '📎', label: 'Datei' }
        };
        return map[typ] || map['sonstige'];
    }

    /** Datum in deutsches Format umwandeln */
    function datumFormatieren(isoString) {
        if (!isoString) return '';
        try {
            const d = new Date(isoString + 'T00:00:00');
            return d.toLocaleDateString('de-DE', {
                day:   '2-digit',
                month: 'long',
                year:  'numeric'
            });
        } catch (_) {
            return isoString;
        }
    }

    /** HTML-Sonderzeichen escapen (XSS-Schutz) */
    function escape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ---- Karte erstellen ---- */

    function karteErstellen(beitrag) {
        const artikel = document.createElement('article');
        artikel.className = 'blog-karte';
        artikel.setAttribute('role', 'listitem');
        artikel.dataset.fach   = beitrag.fach || '';
        artikel.dataset.klasse = beitrag.klasse || '';
        artikel.dataset.typ    = beitrag.dateiTyp || '';

        const typInfo = dateiTypInfo(beitrag.dateiTyp);

        /* Vorschaubereich */
        let vorschauHTML = '';
        if (beitrag.dateiTyp === 'bild' && beitrag.vorschaubild) {
            vorschauHTML = `
                <img
                    class="blog-karte-vorschau"
                    src="${escape(beitrag.vorschaubild)}"
                    alt="Vorschau: ${escape(beitrag.titel)}"
                    loading="lazy"
                >`;
        } else {
            vorschauHTML = `
                <div class="blog-karte-vorschau-placeholder" aria-hidden="true">
                    ${typInfo.icon}
                </div>`;
        }

        /* Aktion-Button-Text */
        let btnLabel = 'Beitrag ansehen';
        if (beitrag.dateiTyp === 'pdf' && beitrag.datei) {
            btnLabel = 'PDF öffnen →';
        } else if (beitrag.dateiTyp === 'bild') {
            btnLabel = 'Bild ansehen →';
        } else if (beitrag.dateiTyp === 'text') {
            btnLabel = 'Text lesen →';
        }

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
                    <span class="blog-karte-typ">
                        ${typInfo.icon} ${typInfo.label}
                    </span>
                    <button
                        class="blog-karte-btn"
                        aria-label="${btnLabel}: ${escape(beitrag.titel)}"
                        data-id="${beitrag.id}"
                    >${btnLabel}</button>
                </div>
            </div>
        `;

        /* Klick auf Karte oder Button öffnet die Detailansicht */
        const btn = artikel.querySelector('.blog-karte-btn');
        btn.addEventListener('click', function () {
            detailOeffnen(beitrag);
        });

        return artikel;
    }

    /* ---- Lightbox / Detailansicht ---- */

    const lightbox         = document.getElementById('lightbox');
    const lightboxInhalt   = document.getElementById('lightbox-inhalt');
    const lightboxSchliess = document.getElementById('lightbox-schliessen');

    function detailOeffnen(beitrag) {
        if (!lightbox || !lightboxInhalt) return;

        const metaText = `${escape(beitrag.autor)} · Klasse ${escape(beitrag.klasse)} · ${datumFormatieren(beitrag.datum)}`;

        if (beitrag.dateiTyp === 'text' && beitrag.textinhalt) {
            /* Textbeitrag direkt anzeigen */
            lightboxInhalt.innerHTML = `
                <div class="lightbox-text-header">
                    <span class="blog-fach-badge ${fachKlasse(beitrag.fach)}">${escape(beitrag.fach)}</span>
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                </div>
                <div class="lightbox-textinhalt">${escape(beitrag.textinhalt)}</div>
            `;
        } else if (beitrag.dateiTyp === 'bild' && beitrag.datei) {
            /* Bild groß anzeigen */
            lightboxInhalt.innerHTML = `
                <div class="lightbox-bild-header">
                    <span class="blog-fach-badge ${fachKlasse(beitrag.fach)}">${escape(beitrag.fach)}</span>
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                    ${beitrag.beschreibung ? `<p style="margin-top:8px;font-size:0.93rem;color:var(--farbe-text-hell);">${escape(beitrag.beschreibung)}</p>` : ''}
                </div>
                <img
                    class="lightbox-bild"
                    src="${escape(beitrag.datei)}"
                    alt="${escape(beitrag.titel)}"
                >
                <br>
                <a href="${escape(beitrag.datei)}" download class="lightbox-download">
                    ⬇ Bild herunterladen
                </a>
            `;
        } else if (beitrag.datei) {
            /* PDF oder sonstige Datei – Link zum Öffnen/Herunterladen */
            lightboxInhalt.innerHTML = `
                <div class="lightbox-text-header">
                    <span class="blog-fach-badge ${fachKlasse(beitrag.fach)}">${escape(beitrag.fach)}</span>
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                    ${beitrag.beschreibung ? `<p style="margin-top:12px;font-size:0.95rem;line-height:1.7;">${escape(beitrag.beschreibung)}</p>` : ''}
                </div>
                <a
                    href="${escape(beitrag.datei)}"
                    target="_blank"
                    rel="noopener"
                    class="lightbox-download"
                >
                    📄 Datei öffnen / herunterladen
                </a>
            `;
        } else {
            /* Kein Anhang – nur Text */
            lightboxInhalt.innerHTML = `
                <div class="lightbox-text-header">
                    <span class="blog-fach-badge ${fachKlasse(beitrag.fach)}">${escape(beitrag.fach)}</span>
                    <h2>${escape(beitrag.titel)}</h2>
                    <p class="lightbox-meta">${metaText}</p>
                </div>
                <p style="font-size:0.97rem;line-height:1.7;">${escape(beitrag.beschreibung)}</p>
            `;
        }

        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        lightboxSchliess.focus();
    }

    function detailSchliessen() {
        if (!lightbox) return;
        lightbox.hidden = true;
        document.body.style.overflow = '';
    }

    if (lightboxSchliess) {
        lightboxSchliess.addEventListener('click', detailSchliessen);
    }

    if (lightbox) {
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) {
                detailSchliessen();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !lightbox.hidden) {
                detailSchliessen();
            }
        });
    }

    /* ---- Filter-Logik ---- */

    const filterFach   = document.getElementById('filter-fach');
    const filterKlasse = document.getElementById('filter-klasse');
    const filterTyp    = document.getElementById('filter-typ');
    const filterZurueck = document.getElementById('filter-zurueck');

    function filterAnwenden() {
        if (!filterFach || !filterKlasse || !filterTyp) return;

        const gewFach   = filterFach.value;
        const gewKlasse = filterKlasse.value;
        const gewTyp    = filterTyp.value;

        /* Zurücksetzen-Button einblenden wenn Filter aktiv */
        const filterAktiv = gewFach || gewKlasse || gewTyp;
        if (filterZurueck) {
            filterZurueck.classList.toggle('sichtbar', !!filterAktiv);
        }

        let sichtbar = 0;
        const karten = document.querySelectorAll('.blog-karte');

        karten.forEach(function (karte) {
            const passt =
                (!gewFach   || karte.dataset.fach   === gewFach)   &&
                (!gewKlasse || karte.dataset.klasse === gewKlasse) &&
                (!gewTyp    || karte.dataset.typ    === gewTyp);

            karte.style.display = passt ? '' : 'none';
            if (passt) sichtbar++;
        });

        /* Leer-Zustand */
        const leerMsg = document.getElementById('blog-leer');
        if (leerMsg) {
            leerMsg.hidden = sichtbar > 0;
        }

        /* Anzahl aktualisieren */
        const anzahlEl = document.getElementById('blog-anzahl');
        if (anzahlEl) {
            if (sichtbar === 0) {
                anzahlEl.textContent = '';
            } else {
                anzahlEl.textContent = sichtbar === 1
                    ? '1 Beitrag gefunden'
                    : sichtbar + ' Beiträge gefunden';
            }
        }
    }

    if (filterFach)    filterFach.addEventListener('change', filterAnwenden);
    if (filterKlasse)  filterKlasse.addEventListener('change', filterAnwenden);
    if (filterTyp)     filterTyp.addEventListener('change', filterAnwenden);

    if (filterZurueck) {
        filterZurueck.addEventListener('click', function () {
            if (filterFach)   filterFach.value   = '';
            if (filterKlasse) filterKlasse.value = '';
            if (filterTyp)    filterTyp.value    = '';
            filterAnwenden();
        });
    }

    /* ---- Beiträge rendern ---- */

    function blogRendern() {
        const grid = document.getElementById('blog-grid');
        if (!grid) return;

        /* Datenquelle prüfen */
        if (typeof BLOG_BEITRAEGE === 'undefined' || BLOG_BEITRAEGE.length === 0) {
            const leerMsg = document.getElementById('blog-leer');
            if (leerMsg) leerMsg.hidden = false;
            const anzahlEl = document.getElementById('blog-anzahl');
            if (anzahlEl) anzahlEl.textContent = 'Noch keine Beiträge vorhanden.';
            return;
        }

        /* Neueste zuerst */
        const sortiert = BLOG_BEITRAEGE.slice().sort(function (a, b) {
            return new Date(b.datum) - new Date(a.datum);
        });

        sortiert.forEach(function (beitrag) {
            grid.appendChild(karteErstellen(beitrag));
        });

        /* Anfangszustand anzeigen */
        filterAnwenden();
    }

    blogRendern();

}());
