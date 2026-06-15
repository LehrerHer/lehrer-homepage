/* ============================================================
   LEHRER-HOMEPAGE – Hauptskript
   Jan Herrmann · Oberschule Spelle
   ============================================================ */


/* ============================================================
   0. NAVBAR & FOOTER VEREINHEITLICHEN
   Rüstet jede Seite auf das schwebende Design um:
   - Bildmarke (Logo) oben links und unten links
   - zentrierte Icon-Navigation mit Tooltip statt Textlinks
   Idempotent: bereits umgebaute Seiten (z. B. index.html)
   werden übersprungen.
   ============================================================ */
(function () {
    'use strict';

    var LOGO_SRC  = '/img/logo.svg';
    var HOME_HREF = '/index.html';

    /* --- Logo in die Navbar setzen --- */
    var logo = document.querySelector('.navbar-logo');
    if (logo && !logo.querySelector('img')) {
        var wortmarke = (logo.textContent || '').trim() || 'lehrer-herrmann.de';
        logo.setAttribute('aria-label', 'Zur Startseite');
        logo.innerHTML =
            '<img src="' + LOGO_SRC + '" alt="" class="navbar-logo-img" width="47" height="38">' +
            '<span class="navbar-logo-text">' + wortmarke + '</span>';
    }

    /* --- Navigations-Links zu Icons + Tooltip umbauen --- */
    var TIPS = [
        { test: /was-ist-neu/i,            icon: '✨',          label: 'Was ist neu?', tip: 'Was ist neu?' },
        { test: /kontakt/i,                icon: '✉️',    label: 'Kontakt',      tip: 'Kontakt' },
        { test: /profil|kolosseum|arena/i, icon: '⚔️',    label: 'Arena',        tip: 'Arena – Lernkolosseum' },
        { test: /blog/i,                   icon: '✍️',    label: 'Blog',         tip: 'Schüler*innenblog' },
        { test: /faecher|fächer/i,    icon: '📚',    label: 'Fächer',  tip: 'Fächer' }
    ];

    function ersteEmoji(text) {
        var token = text.split(/\s+/)[0] || '';
        // Emoji-Token ohne Buchstaben gilt als Icon
        if (/[A-Za-zÀ-ɏ]/.test(token)) return '';
        return /[☀-➿⚔️]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/.test(token) ? token : '';
    }

    var liste = document.querySelector('.navbar-links');
    if (liste) {
        liste.querySelectorAll(':scope > li > a, :scope > li > .navbar-dropdown-toggle').forEach(function (el) {
            if (el.querySelector('.nav-icon')) return; // schon umgebaut
            var roh  = (el.textContent || '').replace(/[▾▼]/g, '').trim();
            var href = el.getAttribute('href') || '';
            var treffer = null;
            TIPS.forEach(function (t) { if (!treffer && (t.test.test(href) || t.test.test(roh))) treffer = t; });

            var icon  = ersteEmoji(roh);
            var label = treffer ? treffer.label : roh.replace(icon, '').trim();
            var tip   = treffer ? treffer.tip   : (roh.replace(icon, '').trim() || label || 'Link');
            if (!icon)  icon  = treffer ? treffer.icon : '🔗';
            if (!label) label = tip;

            el.classList.add('nav-item');
            el.setAttribute('data-tooltip', tip);
            if (el.tagName === 'BUTTON') el.setAttribute('aria-label', tip);
            el.innerHTML =
                '<span class="nav-icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="nav-label">' + label + '</span>';
        });
    }

    /* --- Logo + Marke in den Footer setzen --- */
    var fInner = document.querySelector('.footer-inner, .site-footer-inner');
    if (fInner && !fInner.querySelector('.footer-marke')) {
        var p = fInner.querySelector('p');
        if (p) {
            var marke = document.createElement('div');
            marke.className = 'footer-marke';
            var a = document.createElement('a');
            a.className = 'footer-logo';
            a.href = HOME_HREF;
            a.setAttribute('aria-label', 'Zur Startseite');
            a.innerHTML = '<img src="' + LOGO_SRC + '" alt="" class="footer-logo-img" width="49" height="40">';
            p.parentNode.insertBefore(marke, p);
            marke.appendChild(a);
            marke.appendChild(p);
        }
    }
}());


/* ============================================================
   1. HAMBURGER-MENÜ (Mobile Navigation)
   Das Menü wird per Klick auf den Hamburger-Button geöffnet/
   geschlossen. CSS-Klasse "offen" schaltet die Sichtbarkeit.
   ============================================================ */
(function () {
    const hamburger  = document.getElementById('hamburger');
    const navLinks   = document.getElementById('navbar-links');

    if (!hamburger || !navLinks) return; // Nicht auf der Abgabe-Seite vorhanden

    hamburger.addEventListener('click', function () {
        const istOffen = navLinks.classList.toggle('offen');
        hamburger.setAttribute('aria-expanded', String(istOffen));
        hamburger.setAttribute('aria-label', istOffen ? 'Menü schließen' : 'Menü öffnen');
    });

    // Menü automatisch schließen, wenn ein Navigationslink angeklickt wird
    navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            navLinks.classList.remove('offen');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', 'Menü öffnen');
        });
    });

    // Menü schließen bei Klick außerhalb der Navigation
    document.addEventListener('click', function (ereignis) {
        if (!hamburger.contains(ereignis.target) && !navLinks.contains(ereignis.target)) {
            navLinks.classList.remove('offen');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}());


/* ============================================================
   1b. NAVBAR DROPDOWN (Geschützter Bereich)
   ============================================================ */
(function () {
    'use strict';
    var toggle = document.querySelector('.navbar-dropdown-toggle');
    var menu   = document.querySelector('.navbar-dropdown-menu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var offen = menu.classList.toggle('offen');
        toggle.setAttribute('aria-expanded', String(offen));
    });

    document.addEventListener('click', function () {
        menu.classList.remove('offen');
        toggle.setAttribute('aria-expanded', 'false');
    });

    menu.addEventListener('click', function (e) {
        e.stopPropagation();
    });
}());


/* ============================================================
   2. AKTIVEN NAVIGATIONSLINK BEIM SCROLLEN HERVORHEBEN
   Beim Scrollen wird automatisch der Link der aktuell
   sichtbaren Sektion als "aktiv" markiert.
   ============================================================ */
(function () {
    const sektionen    = document.querySelectorAll('section[id]');
    const navLinkListe = document.querySelectorAll('.navbar-links a');

    if (sektionen.length === 0 || navLinkListe.length === 0) return;

    function aktivenLinkAktualisieren() {
        let aktuelleSektionId = '';

        sektionen.forEach(function (sektion) {
            // 80px Offset wegen der sticky Navbar (Höhe 64px + Puffer)
            if (window.scrollY >= sektion.offsetTop - 80) {
                aktuelleSektionId = sektion.getAttribute('id');
            }
        });

        navLinkListe.forEach(function (link) {
            link.classList.remove('aktiv');
            if (link.getAttribute('href') === '#' + aktuelleSektionId) {
                link.classList.add('aktiv');
            }
        });
    }

    // Beim Scrollen und beim Laden der Seite aufrufen
    window.addEventListener('scroll', aktivenLinkAktualisieren, { passive: true });
    aktivenLinkAktualisieren();
}());


/* ============================================================
   3. COPYRIGHT-JAHR IM FOOTER AUTOMATISCH AKTUALISIEREN
   So muss das Jahr nicht jedes Jahr manuell geändert werden.
   ============================================================ */
(function () {
    const jahrElemente = document.querySelectorAll('#footer-jahr');
    jahrElemente.forEach(function (el) {
        el.textContent = new Date().getFullYear();
    });
}());


/* ============================================================
   4. ABGABE-FORMULAR (nur auf abgabe.html)
   - Prüft die Dateigröße (max. 10 MB) vor dem Absenden
   - Sendet die Formulardaten über die Formspree-API
   - Zeigt eine Erfolgsmeldung nach dem Absenden an
   ============================================================ */
(function () {
    const formular       = document.getElementById('abgabe-formular');
    const erfolgMeldung  = document.getElementById('erfolg-meldung');
    const absendenBtn    = document.getElementById('absenden-btn');
    const ladenAnzeige   = document.getElementById('laden-anzeige');
    const dateiInput     = document.getElementById('datei');

    // Skript nur ausführen, wenn das Formular vorhanden ist (= abgabe.html)
    if (!formular) return;

    // Maximale Dateigröße: 10 Megabyte
    const MAX_DATEI_GROESSE = 10 * 1024 * 1024; // 10 MB in Bytes

    formular.addEventListener('submit', async function (ereignis) {
        // Standard-Submit verhindern (würde die Seite neu laden)
        ereignis.preventDefault();

        /* ---- Eigene Validierung ---- */

        // Pflichtfelder prüfen
        const name    = document.getElementById('schueler-name').value.trim();
        const klasse  = document.getElementById('klasse').value;
        const fach    = document.getElementById('fach').value;
        const aufgabe = document.getElementById('aufgabe').value.trim();

        if (!name || !klasse || !fach || !aufgabe) {
            zeigeFehler('Bitte fülle alle Pflichtfelder aus (markiert mit *).');
            return;
        }

        // Datei prüfen
        if (!dateiInput.files || dateiInput.files.length === 0) {
            zeigeFehler('Bitte wähle eine Datei zum Hochladen aus.');
            return;
        }

        const datei = dateiInput.files[0];

        // Dateigröße prüfen
        if (datei.size > MAX_DATEI_GROESSE) {
            const groesseMB = (datei.size / 1024 / 1024).toFixed(1);
            zeigeFehler(
                'Die Datei ist zu groß! Maximale Größe: 10 MB. ' +
                'Deine Datei hat: ' + groesseMB + ' MB.\n\n' +
                'Tipp: Lade die Datei in Google Drive hoch und füge den Link ins Kommentarfeld ein.'
            );
            return;
        }

        /* ---- Formular absenden ---- */
        ladeanimationStarten();

        // Formulardaten (inkl. Datei) zusammenstellen
        const formulardaten = new FormData(formular);

        try {
            // Anfrage an Formspree schicken
            const antwort = await fetch(formular.action, {
                method:  'POST',
                body:    formulardaten,
                headers: { 'Accept': 'application/json' }
            });

            if (antwort.ok) {
                // Erfolg: Formular verstecken, Erfolgsmeldung anzeigen
                formular.style.display = 'none';
                if (erfolgMeldung) {
                    erfolgMeldung.classList.add('sichtbar');
                    // Zum Anfang der Box scrollen
                    erfolgMeldung.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                // Formspree hat einen Fehler zurückgegeben
                let fehlermeldung = 'Beim Senden ist ein Fehler aufgetreten. Bitte versuche es erneut.';
                try {
                    const fehlerDaten = await antwort.json();
                    if (fehlerDaten.errors && fehlerDaten.errors.length > 0) {
                        fehlermeldung = fehlerDaten.errors.map(function (e) { return e.message; }).join('\n');
                    }
                    // Häufiger Fehler: Form-ID fehlt oder ist falsch
                    if (antwort.status === 404) {
                        fehlermeldung = 'Formspree-Konfiguration fehlt. Bitte die Form-ID in abgabe.html eintragen.';
                    }
                } catch (_) { /* JSON-Parsing fehlgeschlagen – Standardmeldung verwenden */ }

                zeigeFehler(fehlermeldung);
                ladeanimationStoppen();
            }

        } catch (netzwerkFehler) {
            // Kein Internet oder sonstiger technischer Fehler
            zeigeFehler(
                'Keine Verbindung möglich. Bitte prüfe deine Internetverbindung und versuche es erneut.'
            );
            ladeanimationStoppen();
        }
    });

    /* ---- Hilfsfunktionen ---- */

    function ladeanimationStarten() {
        if (absendenBtn) {
            absendenBtn.disabled    = true;
            absendenBtn.textContent = 'Wird gesendet …';
        }
        if (ladenAnzeige) {
            ladenAnzeige.style.display = 'block';
        }
    }

    function ladeanimationStoppen() {
        if (absendenBtn) {
            absendenBtn.disabled    = false;
            absendenBtn.textContent = 'Abgabe einreichen';
        }
        if (ladenAnzeige) {
            ladenAnzeige.style.display = 'none';
        }
    }

    function zeigeFehler(nachricht) {
        // Einfacher Browser-Alert – könnte später durch eine schönere UI ersetzt werden
        alert(nachricht);
    }

}());
