/* ============================================================
   BLOG-EINREICHEN – Direkter Upload zu Supabase
   Jan Herrmann · Oberschule Spelle
   ============================================================ */

(function () {
    'use strict';

    const formular      = document.getElementById('blog-formular');
    const erfolgMeldung = document.getElementById('erfolg-meldung');
    const absendenBtn   = document.getElementById('absenden-btn');
    const ladenAnzeige  = document.getElementById('laden-anzeige');
    const dateiInput    = document.getElementById('datei');
    const fortschritt   = document.getElementById('upload-fortschritt');

    if (!formular) return;

    /* Hinweis einblenden wenn Supabase noch nicht konfiguriert */
    if (typeof SUPABASE_KONFIGURIERT !== 'undefined' && !SUPABASE_KONFIGURIERT) {
        const hinweis = document.createElement('div');
        hinweis.className = 'hinweis-box';
        hinweis.style.cssText = 'margin-bottom:24px;border-left-color:#e67e22;background:#fff8f0;';
        hinweis.innerHTML =
            '⚙️ <strong>Noch nicht eingerichtet:</strong> ' +
            'Bitte die Supabase-Zugangsdaten in <code>js/supabase-config.js</code> eintragen ' +
            '(Anleitung steht direkt in der Datei).';
        formular.insertAdjacentElement('beforebegin', hinweis);
    }

    const MAX_GROESSE = 10 * 1024 * 1024; // 10 MB

    /** Dateityp aus MIME-Type ermitteln */
    function dateiTypErmitteln(datei) {
        if (datei.type.startsWith('image/')) return 'bild';
        if (datei.type === 'application/pdf') return 'pdf';
        if (datei.type.startsWith('text/')) return 'text';
        return 'sonstige';
    }

    /** Einzigartigen Dateinamen erzeugen (verhindert Überschreiben) */
    function einzigartigerDateiname(originName) {
        const endung = originName.split('.').pop().toLowerCase();
        const zufaellig = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        return `${zufaellig}.${endung}`;
    }

    formular.addEventListener('submit', async function (ereignis) {
        ereignis.preventDefault();

        if (typeof SUPABASE_KONFIGURIERT !== 'undefined' && !SUPABASE_KONFIGURIERT) {
            alert('Supabase ist noch nicht konfiguriert.\nBitte erst die Anleitung in js/supabase-config.js befolgen.');
            return;
        }

        /* Felder auslesen */
        const vorname          = document.getElementById('autor-name').value.trim();
        const jahrgang         = document.getElementById('jahrgang').value;
        const klasseBuchstabe  = document.getElementById('klasse-buchstabe').value;
        const klasse           = jahrgang + klasseBuchstabe; // z. B. "7c"
        const fach             = document.getElementById('fach').value;
        const titel            = document.getElementById('beitrag-titel').value.trim();
        const beschreibung     = document.getElementById('beschreibung').value.trim();

        /* Validierung */
        if (!vorname || !jahrgang || !klasseBuchstabe || !fach || !titel) {
            alert('Bitte fülle alle Pflichtfelder aus (markiert mit *).');
            return;
        }

        if (!dateiInput.files || dateiInput.files.length === 0) {
            alert('Bitte wähle eine Datei aus.');
            return;
        }

        const datei = dateiInput.files[0];

        if (datei.size > MAX_GROESSE) {
            const mb = (datei.size / 1024 / 1024).toFixed(1);
            alert(
                `Die Datei ist zu groß (${mb} MB).\n` +
                'Maximale Größe: 10 MB.\n\n' +
                'Tipp: Komprimiere das Bild oder teile ein Google-Drive-Link im Kommentarfeld mit.'
            );
            return;
        }

        ladeanimationStarten();

        try {
            /* ---- Schritt 1: Datei zu Supabase Storage hochladen ---- */
            fortschrittAktualisieren('Datei wird hochgeladen …', 30);

            const dateiname   = einzigartigerDateiname(datei.name);
            const uploadUrl   = `${SUPABASE_URL}/storage/v1/object/blog-beitraege/${dateiname}`;

            const uploadAntwort = await fetch(uploadUrl, {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type':  datei.type || 'application/octet-stream'
                },
                body: datei
            });

            if (!uploadAntwort.ok) {
                const fehlerText = await uploadAntwort.text().catch(() => '');
                throw new Error(`Datei-Upload fehlgeschlagen (${uploadAntwort.status}). ${fehlerText}`);
            }

            /* Öffentliche URL zusammenbauen */
            const dateiUrl = `${SUPABASE_URL}/storage/v1/object/public/blog-beitraege/${dateiname}`;
            const dateiTyp = dateiTypErmitteln(datei);

            /* ---- Schritt 2: Metadaten in Datenbank speichern ---- */
            fortschrittAktualisieren('Beitrag wird gespeichert …', 70);

            const dbAntwort = await fetch(`${SUPABASE_URL}/rest/v1/blog_beitraege`, {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'apikey':        SUPABASE_KEY,
                    'Content-Type':  'application/json',
                    'Prefer':        'return=minimal'
                },
                body: JSON.stringify({
                    titel:        titel,
                    autor:        vorname,
                    klasse:       klasse,
                    fach:         fach,
                    beschreibung: beschreibung,
                    datei_url:    dateiUrl,
                    datei_typ:    dateiTyp
                })
            });

            if (!dbAntwort.ok) {
                const fehlerText = await dbAntwort.text().catch(() => '');
                throw new Error(`Speichern fehlgeschlagen (${dbAntwort.status}). ${fehlerText}`);
            }

            /* ---- Erfolg ---- */
            fortschrittAktualisieren('Fertig!', 100);
            formular.style.display = 'none';
            if (erfolgMeldung) {
                erfolgMeldung.classList.add('sichtbar');
                erfolgMeldung.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

        } catch (fehler) {
            console.error('Upload-Fehler:', fehler);
            alert(
                'Beim Hochladen ist ein Fehler aufgetreten:\n\n' + fehler.message +
                '\n\nBitte versuche es erneut oder wende dich an Herrn Herrmann.'
            );
            ladeanimationStoppen();
        }
    });

    /* ---- Hilfsfunktionen ---- */

    function ladeanimationStarten() {
        if (absendenBtn) {
            absendenBtn.disabled    = true;
            absendenBtn.textContent = 'Wird hochgeladen …';
        }
        if (ladenAnzeige) ladenAnzeige.style.display = 'block';
        if (fortschritt) fortschritt.style.display   = 'block';
    }

    function ladeanimationStoppen() {
        if (absendenBtn) {
            absendenBtn.disabled    = false;
            absendenBtn.textContent = 'Beitrag einreichen';
        }
        if (ladenAnzeige) ladenAnzeige.style.display = 'none';
        if (fortschritt) fortschritt.style.display   = 'none';
    }

    function fortschrittAktualisieren(text, prozent) {
        if (ladenAnzeige) ladenAnzeige.textContent = `⏳ ${text}`;
        if (fortschritt) {
            const balken = fortschritt.querySelector('.fortschritt-balken');
            if (balken) balken.style.width = prozent + '%';
        }
    }

}());
