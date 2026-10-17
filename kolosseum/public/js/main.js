/* ============================================================
   KOLOSSEUM – Navbar/Footer-Skript (Subdomain)
   Spiegelt das schwebende Logo-/Icon-Design der Hauptseite.
   Logos werden absolut von lehrer-herrmann.de geladen.
   ============================================================ */

/* ---- 0. Navbar & Footer vereinheitlichen ---- */
(function () {
    'use strict';

    var LOGO_SRC  = 'https://lehrer-herrmann.de/img/logo.svg';
    var HOME_HREF = 'https://lehrer-herrmann.de/index.html';

    var logo = document.querySelector('.navbar-logo');
    if (logo && !logo.querySelector('img')) {
        var wortmarke = (logo.textContent || '').trim() || 'lehrer-herrmann.de';
        logo.setAttribute('aria-label', 'Zur Startseite');
        logo.innerHTML =
            '<img src="' + LOGO_SRC + '" alt="" class="navbar-logo-img" width="47" height="38">' +
            '<span class="navbar-logo-text">' + wortmarke + '</span>';
    }

    var TIPS = [
        { test: /was-ist-neu/i,            icon: '✨',          label: 'Was ist neu?', tip: 'Was ist neu?' },
        { test: /kontakt/i,                icon: '✉️',    label: 'Kontakt',      tip: 'Kontakt' },
        { test: /profil|kolosseum|arena/i, icon: '⚔️',    label: 'Arena',        tip: 'Arena – Lernkolosseum' },
        { test: /blog/i,                   icon: '✍️',    label: 'Blog',         tip: 'Schüler*innenblog' },
        { test: /faecher|fächer/i,    icon: '📚',    label: 'Fächer',  tip: 'Fächer' }
    ];

    function ersteEmoji(text) {
        var token = text.split(/\s+/)[0] || '';
        if (/[A-Za-zÀ-ɏ]/.test(token)) return '';
        return /[☀-➿⚔️]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/.test(token) ? token : '';
    }

    var liste = document.querySelector('.navbar-links');
    if (liste) {
        liste.querySelectorAll(':scope > li > a, :scope > li > .navbar-dropdown-toggle').forEach(function (el) {
            if (el.querySelector('.nav-icon')) return;
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

    /* --- Emoji-Icons durch einheitliche Linien-Icons (SVG) ersetzen --- */
    var LINIEN_ICONS = {
        '\u2728': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>',
        '\u2709': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        '\u2694': '<path d="M5 5l10 10M5 5h4M5 5v4M19 5L9 15M19 5h-4M19 5v4M7 17l-3 3M17 17l3 3"/>',
        '\u270D': '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>',
        '\uD83D\uDCDA': '<path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M20 17v4H6.5A2.5 2.5 0 014 18.5"/>'
    };
    document.querySelectorAll('.navbar-links .nav-icon').forEach(function (el) {
        if (el.querySelector('svg')) return;
        var zeichen = (el.textContent || '').replace(/\uFE0F/g, '').trim();
        var pfad = LINIEN_ICONS[zeichen];
        if (!pfad) return;
        el.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
            pfad + '</svg>';
    });

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

/* ---- 1. Hamburger-Menü ---- */
(function () {
    var hamburger = document.getElementById('hamburger');
    var navLinks  = document.getElementById('navbar-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', function () {
        var offen = navLinks.classList.toggle('offen');
        hamburger.setAttribute('aria-expanded', String(offen));
        hamburger.setAttribute('aria-label', offen ? 'Menü schließen' : 'Menü öffnen');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            navLinks.classList.remove('offen');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', 'Menü öffnen');
        });
    });
    document.addEventListener('click', function (e) {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
            navLinks.classList.remove('offen');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}());

/* ---- 2. Copyright-Jahr ---- */
(function () {
    document.querySelectorAll('#footer-jahr').forEach(function (el) {
        el.textContent = new Date().getFullYear();
    });
}());
