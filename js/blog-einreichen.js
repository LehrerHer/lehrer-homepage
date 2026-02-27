/* ============================================================
   BLOG-EINREICHEN – Formular-Logik
   Jan Herrmann · Oberschule Spelle
   ============================================================ */

(function () {
    'use strict';

    const formular      = document.getElementById('blog-formular');
    const erfolgMeldung = document.getElementById('erfolg-meldung');
    const absendenBtn   = document.getElementById('absenden-btn');
    const ladenAnzeige  = document.getElementById('laden-anzeige');
    const dateiInput    = document.getElementById('datei');

    if (!formular) return;

    const MAX_GROESSE = 10 * 1024 * 1024; // 10 MB

    formular.addEventListener('submit', async function (ereignis) {
        ereignis.preventDefault();

        const vorname = document.getElementById('autor-name').value.trim();
        const klasse  = document.getElementById('klasse').value;
        const fach    = document.getElementById('fach').value;
        const titel   = document.getElementById('beitrag-titel').value.trim();

        if (!vorname || !klasse || !fach || !titel) {
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
                'Die Datei ist zu groß! Maximal 10 MB erlaubt.\n' +
                'Deine Datei: ' + mb + ' MB.\n\n' +
                'Tipp: Lade die Datei in Google Drive hoch und füge den Link in das Anmerkungsfeld ein.'
            );
            return;
        }

        ladeanimationStarten();

        const formulardaten = new FormData(formular);

        try {
            const antwort = await fetch(formular.action, {
                method:  'POST',
                body:    formulardaten,
                headers: { 'Accept': 'application/json' }
            });

            if (antwort.ok) {
                formular.style.display = 'none';
                if (erfolgMeldung) {
                    erfolgMeldung.classList.add('sichtbar');
                    erfolgMeldung.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                let meldung = 'Beim Senden ist ein Fehler aufgetreten. Bitte versuche es erneut.';
                if (antwort.status === 404) {
                    meldung = 'Formspree-Konfiguration fehlt. Bitte die Form-ID in blog-einreichen.html eintragen.';
                }
                alert(meldung);
                ladeanimationStoppen();
            }
        } catch (_) {
            alert('Keine Verbindung möglich. Bitte prüfe deine Internetverbindung.');
            ladeanimationStoppen();
        }
    });

    function ladeanimationStarten() {
        if (absendenBtn) {
            absendenBtn.disabled    = true;
            absendenBtn.textContent = 'Wird gesendet …';
        }
        if (ladenAnzeige) ladenAnzeige.style.display = 'block';
    }

    function ladeanimationStoppen() {
        if (absendenBtn) {
            absendenBtn.disabled    = false;
            absendenBtn.textContent = 'Beitrag einreichen';
        }
        if (ladenAnzeige) ladenAnzeige.style.display = 'none';
    }

}());
