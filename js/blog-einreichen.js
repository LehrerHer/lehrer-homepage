/* ============================================================
   BLOG-EINREICHEN – Upload zum eigenen Hetzner-Server
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

    const API_URL = ((typeof API_BASE !== 'undefined') ? API_BASE : 'https://kolosseum.lehrer-herrmann.de')
                  + '/api/blog/einreichen';

    const MAX_GROESSE = 10 * 1024 * 1024; // 10 MB

    formular.addEventListener('submit', async function (ereignis) {
        ereignis.preventDefault();

        /* Felder auslesen */
        const vorname         = document.getElementById('autor-name').value.trim();
        const jahrgang        = document.getElementById('jahrgang').value;
        const klasseBuchstabe = document.getElementById('klasse-buchstabe').value;
        const klasse          = jahrgang + klasseBuchstabe;
        const fach            = document.getElementById('fach').value;
        const titel           = document.getElementById('beitrag-titel').value.trim();
        const beschreibung    = document.getElementById('beschreibung').value.trim();

        /* Validierung */
        if (!vorname || !jahrgang || !klasseBuchstabe || !fach || !titel) {
            alert('Bitte fülle alle Pflichtfelder aus (markiert mit *).');
            return;
        }

        const datei = dateiInput && dateiInput.files && dateiInput.files[0];

        if (!datei) {
            alert('Bitte wähle eine Datei aus.');
            return;
        }

        if (datei.size > MAX_GROESSE) {
            const mb = (datei.size / 1024 / 1024).toFixed(1);
            alert(`Die Datei ist zu groß (${mb} MB).\nMaximale Größe: 10 MB.`);
            return;
        }

        ladeanimationStarten();

        try {
            fortschrittAktualisieren('Beitrag wird hochgeladen …', 40);

            const formDaten = new FormData();
            formDaten.append('titel',        titel);
            formDaten.append('autor',        vorname);
            formDaten.append('klasse',       klasse);
            formDaten.append('fach',         fach);
            formDaten.append('beschreibung', beschreibung);
            formDaten.append('datei',        datei);

            const antwort = await fetch(API_URL, {
                method: 'POST',
                body:   formDaten
                // kein Content-Type-Header: Browser setzt multipart/form-data automatisch
            });

            fortschrittAktualisieren('Abschluss …', 90);

            if (!antwort.ok) {
                const fehlerDaten = await antwort.json().catch(() => ({}));
                throw new Error(fehlerDaten.error || `Server-Fehler (${antwort.status})`);
            }

            fortschrittAktualisieren('Fertig!', 100);
            formular.style.display = 'none';
            if (erfolgMeldung) {
                erfolgMeldung.classList.add('sichtbar');
                erfolgMeldung.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

        } catch (fehler) {
            console.error('Upload-Fehler:', fehler);
            alert('Beim Hochladen ist ein Fehler aufgetreten:\n\n' + fehler.message
                + '\n\nBitte versuche es erneut oder wende dich an Herrn Herrmann.');
            ladeanimationStoppen();
        }
    });

    function ladeanimationStarten() {
        if (absendenBtn) { absendenBtn.disabled = true; absendenBtn.textContent = 'Wird hochgeladen …'; }
        if (ladenAnzeige) ladenAnzeige.style.display = 'block';
        if (fortschritt)  fortschritt.style.display  = 'block';
    }

    function ladeanimationStoppen() {
        if (absendenBtn) { absendenBtn.disabled = false; absendenBtn.textContent = 'Beitrag einreichen'; }
        if (ladenAnzeige) ladenAnzeige.style.display = 'none';
        if (fortschritt)  fortschritt.style.display  = 'none';
    }

    function fortschrittAktualisieren(text, prozent) {
        if (ladenAnzeige) ladenAnzeige.textContent = `⏳ ${text}`;
        if (fortschritt) {
            const balken = fortschritt.querySelector('.fortschritt-balken');
            if (balken) balken.style.width = prozent + '%';
        }
    }

}());
