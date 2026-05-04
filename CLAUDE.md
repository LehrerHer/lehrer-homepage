# CLAUDE.md — AI Assistant Guide for lehrer-homepage

This file provides context for AI assistants (e.g., Claude Code) working on this repository.

---

## Project Overview

**lehrer-homepage** is a static teacher homepage for Jan Herrmann at Oberschule Spelle (Lower Saxony, Germany). It consists of two HTML pages, one CSS file, and one JavaScript file — no build tools, frameworks, or package managers are used.

- **Language**: German (UI content and code comments are in German)
- **Tech stack**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **External services**: Google Fonts (CDN), Formspree (form submissions)

---

## Repository Structure

```
lehrer-homepage/
├── index.html           # Main homepage: hero, subject cards, materials, contact
├── abgabe.html          # Student assignment submission form (Formspree-powered)
├── css/
│   └── style.css        # All site styles
├── js/
│   └── main.js          # All site JavaScript
├── materialien/         # Generated interactive worksheets (HTML)
├── upload/              # Drop folder for raw worksheet files
│   └── _erledigt/       # Processed originals (moved here after conversion)
└── tools/
    ├── ab_generator.py  # Watch-loop: upload/ → Claude API → materialien/ → git push
    └── requirements.txt # Python dependencies (anthropic)
```

There are no build tools, transpilation steps, or generated output folders beyond `materialien/`.

---

## How to Run

No installation or build step is needed. Open files directly:

```bash
# Option 1: Open in browser directly
open index.html

# Option 2: Serve with Python
python3 -m http.server 8000

# Option 3: Serve with Node
npx http-server .
```

Visit `http://localhost:8000` to view the site.

---

## Seitenstruktur (vom Betreiber entworfen)

Die Homepage ist in zwei Hauptbereiche gegliedert:

```
Startseite (index.html)
├── Vorstellung „Wer bin ich?" (Hero)
├── Was ist neu? (Funktionen, Quiz-Leistungen, Materialien)
├── Bereiche-Übersicht (Links + kurze Erklärung zu allen Bereichen)
├── Kontakt → kontakt.html (E-Mail verschleiert, kein @ im HTML)
└── Footer: © Impressum · Datenschutz
│
├── ÖFFENTLICH
│   └── Fächervorstellung
│       ├── fach-deutsch.html
│       ├── fach-geschichte.html
│       ├── fach-wipo.html          (Wirtschaft/Politik)
│       ├── fach-informatik.html
│       ├── fach-werte-normen.html
│       ├── fach-andere.html        (Mathe, Englisch, Sport, Bio, Chemie, Physik, Musik, Erdkunde, Gestaltendes Werken)
│       └── fach-ag-projekte.html
│
└── GESCHLOSSEN (Login nötig – Kolosseum-Account)
    ├── Materialien & Quizze (portal.html)
    │   ├── Deutsch        → Arbeitsblätter, Materialien (Hilfen/Links), Quizze
    │   ├── Geschichte     → Arbeitsblätter, Materialien, Quizze
    │   ├── andere Fächer
    │   │   ├── Wirtschaft/Politik
    │   │   ├── Werte und Normen
    │   │   ├── Informatik
    │   │   └── Gestaltendes Werken
    │   └── AGs & Projekte
    ├── Schüler*innenblog (blog.html)
    │   └── blog-einreichen.html
    └── Lernkolosseum
        ├── Übersicht/Landing (kolosseum.html) – geschützt via auth-guard.js
        │   └── Einstiegsseite mit Quizliste und XP-Erklärung (nur für Eingeloggte)
        ├── Profil (kolosseum/public/profil.html) – primäres Ziel aller Arena-Links
        │   ├── Rangliste (kolosseum/public/rangliste.html)
        │   └── Arena / Quiz-Spiel
        └── Admin-Ebene (kolosseum/public/admin/)
            ├── Einladungslink erstellen
            ├── Material hochladen
            └── Manuelle XP-Vergabe
```

### Zugangslogik (`js/homepage-gate.js`)
- Prüft Kolosseum-Session via `GET /api/auth/me`
- **Eingeloggt**: Lernkolosseum-Teaser, Materialien-Sektion und Blog-Teaser werden eingeblendet; Login-Gate ausgeblendet
- **Nicht eingeloggt**: Login-Gate sichtbar; geschützte Sektionen ausgeblendet
- Die Bereiche-Übersicht (`#bereiche-uebersicht`) ist **immer öffentlich** sichtbar, zeigt jedoch alle Bereiche inkl. Lernkolosseum als **„🔒 Login nötig"**

### Link-Ziel für Lernkolosseum
- Alle „Zur Arena"-Links (Bereiche-Übersicht, Lernkolosseum-Teaser, Navbar) zeigen auf **`kolosseum/public/profil.html`**
- `kolosseum.html` ist eine sekundäre Übersichtsseite (geschützt via `auth-guard.js`), die Quizze und XP-Info bündelt
- Öffentlich vorgelagerte Inhalte (z. B. Demo-Quizze ohne Login) werden später bewusst ergänzt – noch nicht vorhanden

### XP-Berechnung: Externe Quizze (Notenpunkte-System)

Externe Quizze (Stilmittel, Literaturwissenschaft, Rechtschreibung) vergeben XP nach dem Notenpunkte-System der gymnasialen Oberstufe. Die Formel lautet:

**XP = Notenpunkte × Anzahl gespielter Fragen**

Die Punktetabelle (Rohpunkte = prozentualer Anteil richtiger Antworten):

| Notenpunkte | Rohpunkte (%) |
|:-----------:|:-------------:|
| 15          | ≥ 95 %        |
| 14          | ≥ 90 %        |
| 13          | ≥ 85 %        |
| 12          | ≥ 80 %        |
| 11          | ≥ 75 %        |
| 10          | ≥ 70 %        |
| 9           | ≥ 65 %        |
| 8           | ≥ 60 %        |
| 7           | ≥ 55 %        |
| 6           | ≥ 50 %        |
| 5           | ≥ 45 %        |
| 4           | ≥ 40 %        |
| 3           | ≥ 33 %        |
| 2           | ≥ 27 %        |
| 1           | ≥ 20 %        |
| 0           | < 20 %        |

XP werden nur beim **ersten** Absolvieren gutgeschrieben. Die Berechnung findet server-seitig in `kolosseum/routes/external.js` (`computeNotenpunkte`) und client-seitig (Vorschau für Gäste) in `js/kolosseum-prompt.js` statt.

---

## Key Files and Their Roles

### `index.html`
- Main teacher profile page
- Sections: sticky navbar, hero (`#startseite`), was-ist-neu (`#was-ist-neu`), bereiche-übersicht (`#bereiche-uebersicht`), login-gate, lernkolosseum, digitalematerialien, blog-teaser, kontakt (`#kontakt`), footer
- Copyright year is set dynamically via `id="footer-jahr"`

### `abgabe.html`
- Student assignment upload form
- Integrates with **Formspree**: the form action URL contains `YOUR_FORM_ID` as a placeholder — this must be replaced with a real Formspree form ID before the form works
- Tagged `noindex, nofollow` — intentionally excluded from search engines
- Accepts: PDF, JPG, PNG, DOCX, ZIP (max 10 MB)

### `js/main.js`
Four self-contained IIFE modules, each independent:

| Module | Lines | Purpose |
|--------|-------|---------|
| Hamburger menu | 12–40 | Mobile nav toggle with ARIA support |
| Scroll-spy nav | 48–75 | Highlights active nav link on scroll |
| Footer year | 82–87 | Sets current year in copyright |
| Submission form | 96–221 | Validates and submits the assignment form via fetch |

### `css/style.css`
- Uses **CSS custom properties** defined at `:root`:
  - `--primary-color: #1e3a5f` (dark blue)
  - `--accent-color: #4a9eda` (light blue)
  - `--transition`, `--border-radius`, `--shadow` etc.
- Responsive breakpoints: `768px` (tablet) and `480px` (mobile)
- Mobile-first layout using CSS Grid and Flexbox

---

## Coding Conventions

### HTML
- Language: `lang="de"`, all user-visible text is in German
- Semantic elements: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`
- ARIA attributes on interactive elements (hamburger button, nav links)
- Icons are Unicode emoji, not icon fonts or SVGs
- IDs follow `kebab-case` and match JavaScript selectors

### CSS
- **No preprocessors** — pure CSS only
- CSS variables for all repeated values (colors, spacing, transitions)
- Class names: `kebab-case`, semantic and descriptive
- Section comments use `/* === SECTION NAME === */` style headers
- Do not introduce utility classes or a CSS framework

### JavaScript
- **No frameworks, no npm packages** — vanilla ES6+ only
- Each feature is wrapped in an IIFE `(function() { ... })()` for isolation
- No global variables
- Variable/comment naming: German for domain concepts, English for code constructs
- Async form submission uses `fetch` with `async/await`
- Error handling uses `try/catch` with user-facing German error messages
- All DOM queries use `document.querySelector` / `document.querySelectorAll`

---

## Development Workflow

### Making Changes
1. Edit files directly — no build step required
2. Refresh the browser to test
3. Test on multiple viewport widths (desktop, tablet `768px`, mobile `480px`)

### No Tests or Linting
- There is no test suite, no CI/CD, and no linter configuration
- Validate HTML manually or with the W3C validator
- Check JavaScript in browser DevTools console

### Git — PFLICHTREGELN FÜR CLAUDE

- **NIE direkt auf `main` committen oder pushen.** Kein einziger Commit darf direkt auf `main` landen.
- **Immer auf dem zugewiesenen Feature-Branch arbeiten.** Der Branch wird vom Harness vorgegeben (`claude/<beschreibung>-<session-id>`). Existiert er noch nicht lokal: `git checkout -b claude/<beschreibung>-<id>`.
- **Kein `git reset --hard main`**, kein Merge von `main` in den Feature-Branch ohne explizite Aufforderung des Nutzers.
- **Kein Force-Push auf `main`** — unter keinen Umständen.
- Nach Abschluss der Arbeit den Feature-Branch pushen (`git push -u origin <branch>`). Den Nutzer fragen, ob er mergen soll — nie selbst mergen, außer der Nutzer fordert das ausdrücklich auf.
- Commit-Befehl immer mit `-c user.email="jan@lehrer-herrmann.de" -c user.name="Jan Herrmann"`
- Commit-Nachrichten auf Deutsch oder Englisch

### Deploy – vollautomatisch via GitHub-Webhook
Der Server (178.105.35.83) zieht automatisch, sobald ein Push auf `main` bei GitHub eingeht.
**Kein manueller SSH-Befehl nötig.**

Einmalige Einrichtung (nur wenn der Webhook noch nicht aktiv ist):
1. Auf dem Server in `/var/www/lehrer-homepage/kolosseum/.env` setzen:
   ```
   DEPLOY_SECRET=<zufälliges Secret>
   DEPLOY_DIR=/var/www/lehrer-homepage
   PM2_APP=kolosseum
   ```
2. In den GitHub-Repository-Einstellungen unter *Webhooks* eintragen:
   - Payload URL: `https://kolosseum.lehrer-herrmann.de/api/deploy`
   - Content type: `application/json`
   - Secret: dasselbe wie `DEPLOY_SECRET`
   - Event: *Just the push event*

---

## Formspree Setup

The `abgabe.html` form requires a Formspree account:

1. Register at [formspree.io](https://formspree.io)
2. Create a new form and copy the form ID
3. Replace `YOUR_FORM_ID` in `abgabe.html` (line ~68) with your actual ID:
   ```html
   <!-- Before -->
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" ...>
   <!-- After -->
   <form action="https://formspree.io/f/abcd1234" method="POST" ...>
   ```

---

## Accessibility Requirements

All changes must maintain:
- Semantic HTML structure
- ARIA labels on interactive elements
- Visible focus states for keyboard navigation
- Sufficient color contrast (WCAG AA minimum)
- No information conveyed by color alone

---

## What NOT to Do

- Do not introduce npm, a bundler (webpack/vite), or a CSS preprocessor
- Do not add a JavaScript framework (React, Vue, Alpine, etc.)
- Do not create additional files unless clearly necessary
- Do not remove ARIA attributes or semantic HTML elements
- Do not change text content from German to another language
- Do not add global JavaScript variables (use IIFEs)
- Do not hardcode colors — use the existing CSS variables

---

## Interaktive Arbeitsblätter (Worksheet-Generator)

Dieser Assistent unterstützt Jan Herrmann und sein Kollegium dabei, hochgeladene
Arbeitsblätter (PDF, Bild oder Text) in interaktive, eigenständige HTML-Dateien
umzuwandeln, die direkt auf der statischen Homepage eingebettet werden können.

### Ablageort

Generierte Arbeitsblatt-Dateien gehören in den Unterordner `materialien/`:

```
lehrer-homepage/
└── materialien/
    ├── deutsch_einfuehrung_5r_2026-04.html
    └── ...
```

Von `index.html` werden sie im Abschnitt `#materialien` verlinkt.

### Ausgabeformat

Jede generierte Datei ist eine vollständige, standalone HTML-Datei mit:
- Eingebettetem CSS (kein externes Stylesheet)
- Eingebettetem JavaScript (keine externen Bibliotheken außer ggf. cdn.jsdelivr.net für spezifische Komponenten)
- Responsivem Design (funktioniert auf Schüler-Smartphones)
- Einheitlichem Designsystem (siehe unten)

### Designsystem für Arbeitsblätter

Die Farben orientieren sich an der Homepage:

| Rolle             | Wert      | Verwendung                        |
|-------------------|-----------|-----------------------------------|
| Primärfarbe       | `#1e3a5f` | Überschriften, Buttons            |
| Akzentfarbe       | `#4a9eda` | Links, Fokus-Zustände             |
| Korrekt-Feedback  | `#2ecc71` | Grün bei richtiger Antwort        |
| Fehler-Feedback   | `#e74c3c` | Rot bei falscher Antwort          |
| Hintergrund       | `#f4f6f7` | Seiten-Hintergrund                |
| Karten-Hintergrund| `#ffffff`  | Aufgaben-Karten                   |

Weitere Vorgaben:
- Schriftart: `system-ui, sans-serif`
- `border-radius: 8px`, `box-shadow` auf Karten
- Maximale Breite: `800px`, zentriert

### AB-Typen und ihre Umsetzung

| Typ | Umsetzung |
|-----|-----------|
| **Lückentext** | Input-Felder inline im Text, Auswertung per Button, Feedback pro Lücke + Gesamtpunktzahl |
| **Multiple Choice** | Radio-Buttons oder Checkboxen, klares Feedback nach Abgabe, kein Mehrfachversuch ohne Reset |
| **Zuordnung** | Drag & Drop oder Dropdown-Menüs je nach Komplexität |
| **Textanalyse / offen** | Textarea mit Zeichenzähler, Musterlösung aufklappbar (zunächst verborgen) |
| **Schreibaufgabe** | Strukturierte Textfelder mit Hilfestellungen, optionale Bewertungsrubrik einblendbar |
| **Sonstiges** | Typ selbst erkennen, passendste interaktive Umsetzung wählen |

### Metadaten-Header

Jede generierte HTML-Datei beginnt mit einem auskommentierten Block:

```html
<!--
  Titel: [Titel des AB]
  Fach: [erkanntes Fach]
  Klasse/Niveau: [erkanntes Niveau oder "nicht angegeben"]
  AB-Typ: [Lückentext / MC / Zuordnung / Offen / Gemischt]
  Erstellt: [Datum]
  Quelle: [Originalformat des hochgeladenen Dokuments]
-->
```

### Dateiname-Konvention

```
fach_thema_klasse_JJJJ-MM.html
```

Beispiel: `deutsch_einfuehrung_9r_2026-04.html`

### Workflow-Hinweis nach der Generierung

Nach der HTML-Ausgabe kurz angeben:
- Welche Inhalte nicht eindeutig erkannt werden konnten
- Ob Musterlösungen fehlen und nachgereicht werden sollten
- Ob Annahmen über das Niveau getroffen wurden
