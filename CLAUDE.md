# CLAUDE.md — AI Assistant Guide for lehrer-homepage

This file provides context for AI assistants (e.g., Claude Code) working on this repository.

---

## Project Overview

**lehrer-homepage** ist die Lehrerhomepage von Jan Herrmann an der Oberschule Spelle (Niedersachsen). Das Projekt besteht aus einer statischen Webseite (HTML/CSS/JS) **und** einem Node.js-Backend (Lernkolosseum), das Schülerkonten, XP-System, Quizze, Blog und Bestenlisten bereitstellt.

- **Sprache**: Deutsch (UI-Inhalte und Code-Kommentare sind auf Deutsch)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+) — kein Build-Tool, kein Framework
- **Backend**: Node.js (Express) + SQLite, gehostet auf Render.com unter `kolosseum.lehrer-herrmann.de`
- **Externe Dienste**: Google Fonts (CDN), Formspree (Aufgaben-Abgabe), GoatCounter (Analytics), Render.com (Backend-Hosting)

---

## Repository-Struktur

```
lehrer-homepage/
│
├── index.html                     # Startseite: Hero, Was ist neu?, Bereiche-Übersicht
├── abgabe.html                    # Aufgaben-Abgabe-Formular (Formspree)
├── kontakt.html                   # Kontaktseite (E-Mail verschleiert per JS)
├── impressum.html                 # Impressum
├── datenschutz.html               # Datenschutzerklärung
├── portal.html                    # Materialportal (Login nötig)
├── blog.html                      # Schüler*innenblog (Login nötig)
├── blog-einreichen.html           # Blog-Einreichungsformular
├── kolosseum.html                 # Arena-Landingpage (öffentlich)
├── lehrer-upload.html             # Lehrer-Upload-Interface
│
├── fach-deutsch.html              # Fachseite Deutsch
├── fach-geschichte.html           # Fachseite Geschichte
├── fach-wipo.html                 # Fachseite Wirtschaft/Politik
├── fach-informatik.html           # Fachseite Informatik
├── fach-werte-normen.html         # Fachseite Werte & Normen
├── fach-ag-projekte.html          # Fachseite AGs & Projekte
│
├── stilmittel-quiz.html           # Quiz: Rhetorische Stilmittel (Deutsch)
├── literaturwissenschaft_quiz_v2.html  # Quiz: Literaturwissenschaft (Deutsch)
├── rechtschreibquiz.html          # Quiz: Rechtschreibung (Deutsch)
├── narratologische-analyse.html   # Arbeitsblatt: Narratologische Analyse (Deutsch)
├── deutsch-dialektische-eroerterung.html  # Arbeitsblatt: Dialektische Erörterung
├── fuenfschrittlesemethode.html   # Arbeitsblatt: 5-Schritt-Lesemethode
├── ab-herrschaft-mittelalter.html # Arbeitsblatt: Herrschaft im Mittelalter (Geschichte, Jg. 6)
│
├── inhalte.json                   # Downloadmaterialien-Index (PDFs, von dynamic-content.js geladen)
├── render.yaml                    # Render.com-Deployment-Konfiguration für das Kolosseum-Backend
├── deploy.bat                     # Windows-Hilfsskript für manuelle Deploys (lokal)
│
├── css/
│   └── style.css                  # Alle Stile für die statische Seite
│
├── js/
│   ├── main.js                    # Hamburger-Menü, Scroll-Spy, Footer-Jahr, Abgabe-Formular
│   ├── auth-guard.js              # Seitenschutz: blendet Body aus, prüft Login, zeigt Sperr-Overlay
│   ├── homepage-gate.js           # Startseite: blendet geschützte Sektionen je nach Login-Status ein/aus
│   ├── dynamic-content.js         # Lädt inhalte.json, rendert Materialkarten (portal.html, index.html)
│   ├── was-ist-neu.js             # „Was ist neu?"-Sektion: aggregiert Quiz-, Material- und Blog-Neuigkeiten
│   ├── kolosseum-login-widget.js  # Login-Widget in der Navbar (zeigt Nick + Level wenn eingeloggt)
│   ├── kolosseum-prompt.js        # Einladungs-Prompt für nicht eingeloggte Besucher
│   ├── arena-bar.js               # Arena-Bar: zeigt XP-Fortschritt oben auf Quiz-/AB-Seiten
│   ├── blog.js                    # Blog-Ansicht: lädt und rendert Beiträge
│   ├── blog-daten.js              # Blog-Datenhilfen (Kategorien, Formatierung)
│   ├── blog-einreichen.js         # Blog-Einreichungsformular-Logik
│   └── supabase-config.js         # API-Konfiguration: API_BASE = 'https://kolosseum.lehrer-herrmann.de'
│                                  # (Name historisch – Supabase wurde durch eigenes Backend ersetzt)
│
├── img/
│   ├── arena-gladiatoren.png      # Illustriertes Arena-Bild für Kolosseum-Teaser
│   └── vater-und-sohn-bildergeschichte.jpg  # Bild für Bildergeschichte-AB
│
├── pdfs/
│   ├── AB4_Seite1_Die_Reise_einer_Jeans.pdf
│   ├── W_Aufbau_Interpretationsaufsatz_Literatur_V2.pdf
│   └── deutsch/
│       ├── Textlupe Eröffnungsrede JD Klasse Jhg 8.pdf
│       └── dialektische-eroerterung-handout.pdf
│
├── materialien/                   # Generierte interaktive Arbeitsblätter (HTML, ab_generator.py)
│
├── upload/                        # Eingangsordner für neue Rohdateien (ab_generator.py)
│   └── _erledigt/                 # Verarbeitete Originale (nach Konvertierung hierher verschoben)
│
├── tools/
│   ├── ab_generator.py            # Watch-Loop: upload/ → Claude API → materialien/ → git push
│   └── requirements.txt           # Python-Abhängigkeiten (anthropic)
│
├── kolosseum/                     # Node.js-Backend (Lernkolosseum)
│   ├── server.js                  # Express-Einstiegspunkt
│   ├── package.json               # Abhängigkeiten: express, better-sqlite3, bcryptjs, multer, dotenv
│   ├── .env.example               # Vorlage für Umgebungsvariablen
│   ├── db/
│   │   ├── database.js            # DB-Initialisierung (better-sqlite3)
│   │   ├── schema.sql             # Tabellenstruktur (siehe unten)
│   │   ├── badges.js              # Badge-Definitionen und -Vergabe
│   │   └── seed.js                # Demo-Daten für Entwicklung
│   ├── middleware/
│   │   ├── auth.js                # Session-Auth-Middleware
│   │   └── rateLimit.js           # Rate-Limiting
│   ├── routes/
│   │   ├── auth.js                # /api/auth – Login, Logout, Register, /me
│   │   ├── students.js            # /api/students – Profil, Stats, XP
│   │   ├── quiz.js                # /api/quizzes – Quiz-CRUD (Admin)
│   │   ├── external.js            # /api/external – XP für externe Quiz-Seiten (stilmittel etc.)
│   │   ├── leaderboard.js         # /api/leaderboard – Quiz-Bestenlisten
│   │   ├── public.js              # /api/public – öffentliche Stats und Ranglisten
│   │   ├── admin.js               # /api/admin – Einladungslinks, Nutzerverwaltung
│   │   ├── blog.js                # /api/blog – Blog-CRUD (Einreichen, Genehmigen, Anzeigen)
│   │   ├── ai-feedback.js         # /api/ai-feedback – KI-gestütztes Feedback (z. B. für Aufsätze)
│   │   └── deploy.js              # /api/deploy – GitHub-Webhook für automatisches Deployment
│   └── public/                    # Statische Kolosseum-Seiten (unter kolosseum.lehrer-herrmann.de)
│       ├── login.html
│       ├── register.html
│       ├── profil.html
│       ├── quiz.html
│       ├── quiz-spiel.html
│       ├── rangliste.html
│       ├── css/style.css
│       ├── js/
│       │   ├── arena-bar.js
│       │   └── avatar.js
│       └── admin/
│           ├── index.html
│           ├── dashboard.html
│           ├── quiz.html
│           └── schueler.html
│
└── Material manuell von mir/      # Quell-Dokumente des Betreibers (nicht deployed)
```

---

## How to Run

### Statische Seite
Kein Build-Schritt nötig:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

### Kolosseum-Backend (lokal)
```bash
cd kolosseum
cp .env.example .env   # und Werte eintragen
npm install
npm start
# → http://localhost:3000
```

Für volle Funktionalität (Was-ist-neu, Login-Status, Quizze) muss das Backend erreichbar sein.

---

## Seitenstruktur (vom Betreiber entworfen)

```
Startseite (index.html)
├── Hero (Vorstellung, Fach-Badges)
├── Was ist neu? (Neuigkeiten aus Quiz, Materialien, Blog, Avatar-Levelups)
├── Bereiche-Übersicht (immer öffentlich – alle Bereiche mit Links)
├── Login-Gate (sichtbar wenn NICHT eingeloggt)
├── Lernkolosseum-Teaser (nur eingeloggt)
├── Digitale Arbeitsblätter & Quizze (nur eingeloggt)
├── Blog-Teaser (nur eingeloggt)
├── Kontakt
└── Footer: © Impressum · Datenschutz
│
├── ÖFFENTLICH
│   ├── Fächervorstellungen
│   │   ├── fach-deutsch.html
│   │   ├── fach-geschichte.html
│   │   ├── fach-wipo.html          (Wirtschaft/Politik)
│   │   ├── fach-informatik.html
│   │   ├── fach-werte-normen.html
│   │   └── fach-ag-projekte.html
│   ├── Arena-Landingpage (kolosseum.html)
│   └── Quizze spielbar ohne Login (XP wird nur vergeben wenn eingeloggt)
│
└── GESCHLOSSEN (Login nötig – Kolosseum-Account)
    ├── Materialportal (portal.html)
    │   ├── Interaktive Arbeitsblätter (aus materialien/)
    │   ├── Quizze mit XP-Tracking
    │   └── Downloadmaterialien (aus inhalte.json + pdfs/)
    ├── Schüler*innenblog (blog.html / blog-einreichen.html)
    └── Lernkolosseum (kolosseum.lehrer-herrmann.de)
        ├── Profil + Ausrüstung + Rangliste (profil.html)
        ├── Quiz-Spiel mit XP-Vergabe (quiz-spiel.html)
        └── Admin-Bereich (admin/)
            ├── Nutzerverwaltung + XP-Vergabe
            ├── Quiz-Verwaltung
            └── Einladungslinks generieren
```

### Zugangslogik

**`js/homepage-gate.js`** (auf `index.html`):
- Prüft Kolosseum-Session via `GET /api/auth/me`
- Eingeloggt → `#lernkolosseum`, `#digitale-materialien`, `#blog-teaser` einblenden; `#homepage-login-gate` ausblenden
- Nicht eingeloggt → Login-Gate sichtbar; geschützte Sektionen ausgeblendet
- `#bereiche-uebersicht` ist **immer** öffentlich sichtbar

**`js/auth-guard.js`** (auf `portal.html`, Arbeitsblättern, Quizseiten):
- Muss im `<head>` ohne `defer`/`async` eingebunden sein
- Versteckt `<body>` sofort beim Laden
- Ruft `/api/auth/me` ab: eingeloggt → Seite anzeigen; nicht eingeloggt → Sperr-Overlay mit Login-Button

---

## Schlüsseldateien und ihre Rollen

### `index.html`
Sektionen: Navbar (sticky), Hero (`#startseite`), Was-ist-neu (`#was-ist-neu`), Bereiche-Übersicht (`#bereiche-uebersicht`), Login-Gate (`#homepage-login-gate`), Lernkolosseum (`#lernkolosseum`), Digitale Materialien (`#digitale-materialien`), Blog-Teaser (`#blog-teaser`), Kontakt (`#kontakt`), Footer.

Eingebundene Scripts (in dieser Reihenfolge):
`main.js` → `dynamic-content.js` → `supabase-config.js` → `was-ist-neu.js` → `arena-bar.js` → `kolosseum-login-widget.js` → `homepage-gate.js` → GoatCounter

### `abgabe.html`
- Aufgaben-Upload-Formular mit Formspree
- `action="https://formspree.io/f/YOUR_FORM_ID"` — **Platzhalter**, muss durch echte Form-ID ersetzt werden
- `noindex, nofollow` — absichtlich aus Suchmaschinen ausgeblendet
- Akzeptiert: PDF, JPG, PNG, DOCX, ZIP (max. 10 MB)

### `kontakt.html`
E-Mail-Adresse wird per JavaScript aus zwei Teilen zusammengesetzt (kein `@` im HTML-Quelltext).

### `inhalte.json`
Array von herunterladbaren Materialien (PDFs). Felder: `id`, `titel`, `beschreibung`, `icon`, `url` (relativer Pfad), `seite` (Fach-Kürzel), `datum`. Wird von `dynamic-content.js` geladen.

### `js/supabase-config.js`
Trotz des Namens kein Supabase mehr — definiert nur `API_BASE = 'https://kolosseum.lehrer-herrmann.de'`. Name ist historisch (Migration von Supabase auf eigenes Backend).

### `js/main.js`
Vier unabhängige IIFE-Module:

| Modul | Zeilen | Zweck |
|-------|--------|-------|
| Hamburger-Menü | 12–40 | Mobile-Nav-Toggle mit ARIA |
| Scroll-Spy-Nav | 48–75 | Aktiven Nav-Link beim Scrollen hervorheben |
| Footer-Jahr | 82–87 | Copyright-Jahr dynamisch setzen |
| Abgabe-Formular | 96–221 | Validierung + Formspree-Submit |

### `css/style.css`
CSS Custom Properties in `:root`:

| Variable | Wert | Verwendung |
|----------|------|------------|
| `--farbe-primaer` | `#1e3a5f` | Dunkelblau – Hauptfarbe |
| `--farbe-primaer-hell` | `#2d6a9f` | Mittleres Blau |
| `--farbe-akzent` | `#4a9eda` | Hellblau – Badges, Hover |
| `--farbe-hintergrund` | `#f4f6f9` | Seitenhintergrund |
| `--farbe-text` | `#2c3e50` | Fließtext |
| `--farbe-text-hell` | `#6c757d` | Hilfstext |
| `--farbe-rahmen` | `#dee2e6` | Rahmen und Trennlinien |
| `--farbe-erfolg` | `#27ae60` | Erfolgsmeldungen |
| `--schatten` | `0 2px 12px rgba(30,58,95,.10)` | Box-Shadow |
| `--radius` | `8px` | Border-Radius |
| `--transition` | `0.3s ease` | Animationen |

Responsive Breakpoints: `768px` (Hamburger-Nav), `600px` (Grids kollabieren).

---

## Lernkolosseum-Backend

### Architektur
Express.js + SQLite (`better-sqlite3`), Sessions in SQLite gespeichert. CORS für `lehrer-herrmann.de`-Origins. SameSite=None-Cookies für Cross-Origin-Quiz-Completion.

### Datenbank-Tabellen (Kurzübersicht)

| Tabelle | Zweck |
|---------|-------|
| `students` | Schüler-Profile: Nick, PIN-Hash, XP, Datumsfelder |
| `student_names` | Echter Name + Klasse (getrennt, nicht öffentlich) |
| `student_badges` | Verdiente Abzeichen |
| `xp_log` | XP-Transaktionshistorie |
| `quizzes`, `questions`, `quiz_results` | Internes Quiz-System (Admin-Quizze) |
| `external_quiz_results` | Abschlüsse der statischen Quiz-Seiten (Stilmittel, Literatur, Rechtschreibung) |
| `quiz_bestenliste` | Bestenlisten je Quiz und Modus |
| `blog_beitraege` | Schüler-Blog-Einreichungen (mit Moderations-Flag `genehmigt`) |
| `challenges` | Platzhalter für zukünftige Gladiator-Duelle (Status: pending/won/lost) |
| `invite_tokens` | Registrierungstokens (begrenzte Nutzungen, Ablaufdatum) |
| `sessions` | Express-Session-Store |

### Gladiator-Level-System

| Level | Name | XP |
|-------|------|----|
| 1 | Rekrut | 0 |
| 2 | Legionär | 100 |
| 3 | Zenturio | 250 |
| 4 | Tribun | 500 |
| 5 | Prätor | 900 |
| 6 | Konsul | 1400 |
| 7 | Legende | 2000 |

### Deployment (Render.com)
- Service-Name: `lernkolosseum`, Root: `kolosseum/`, Plan: free
- Persistente Disk: `/data/kolosseum.db` (1 GB)
- Env-Variablen: `NODE_ENV=production`, `SESSION_SECRET` (auto), `DB_PATH=/data/kolosseum.db`
- `ADMIN_PASSWORD_HASH` muss manuell im Render-Dashboard gesetzt werden (bcryptjs)

---

## Coding Conventions

### HTML
- `lang="de"`, alle sichtbaren Texte auf Deutsch
- Semantische Elemente: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`
- ARIA-Attribute auf interaktiven Elementen (Hamburger-Button, Nav-Links)
- Icons: Unicode-Emoji (keine Icon-Fonts, keine SVGs)
- IDs: `kebab-case`, passend zu JS-Selektoren

### CSS
- **Keine Präprozessoren** — reines CSS
- CSS-Variablen für alle wiederkehrenden Werte (Farben, Übergänge, Abstände)
- Klassennamen: `kebab-case`, semantisch
- Abschnittskommentare: `/* === ABSCHNITTSNAME === */`
- Keine Utility-Klassen, kein CSS-Framework

### JavaScript (statische Seite)
- **Kein Framework, kein npm** — Vanilla ES6+
- Jede Funktion als IIFE `(function() { ... })()` — keine globalen Variablen
- Variablen/Kommentare: Deutsch für Domainkonzepte, Englisch für Code-Konstrukte
- Async-Fetch mit `async/await`, Fehlerbehandlung mit `try/catch`
- Deutsche Fehlermeldungen für Nutzer
- DOM-Queries: `document.querySelector` / `document.querySelectorAll`

### JavaScript (Kolosseum-Backend)
- Node.js mit CommonJS (`require`)
- Keine TypeScript, keine Transpilierung
- SQLite-Abfragen synchron mit `better-sqlite3`

---

## Development Workflow

### Statische Seite
1. Dateien direkt bearbeiten — kein Build-Schritt
2. Browser-Refresh zum Testen
3. Auf mehreren Viewport-Breiten testen: Desktop, Tablet (`768px`), Mobil (`600px`)

### Backend-Änderungen
1. In `kolosseum/` arbeiten
2. Lokal testen mit `npm start`
3. Deployment auf Render.com erfolgt automatisch nach Push auf `main`

### Keine Tests / kein Linter
- Kein Test-Framework, keine CI/CD, keine Linter-Konfiguration
- HTML manuell oder mit W3C-Validator prüfen
- JS im Browser-DevTools-Konsole debuggen

### Git
- Default-Branch: `main`
- **Einzelentwickler-Projekt – IMMER direkt auf `main` pushen, niemals Feature-Branches stehen lassen.**
- Commit-Befehl immer mit `-c user.email="jan@lehrer-herrmann.de" -c user.name="Jan Herrmann"`
- Commit-Messages auf Deutsch oder Englisch

**Wenn das Harness einen Feature-Branch zuweist** (z. B. `claude/xyz`), nach Abschluss der Arbeit sofort auf `main` mergen:
```bash
git checkout main
git merge --no-ff claude/xyz -m "Merge: <kurze Beschreibung>"
git -c user.email="jan@lehrer-herrmann.de" -c user.name="Jan Herrmann" push origin main
```
Danach den Feature-Branch lokal löschen (remote-Branches werden beim nächsten Cleanup entfernt).

### Deploy – vollautomatisch via GitHub-Webhook
Der Server zieht automatisch, sobald ein Push auf `main` bei GitHub eingeht.
**Kein manueller SSH-Befehl nötig.**

Einmalige Einrichtung (nur wenn der Webhook noch nicht aktiv ist):
1. In `kolosseum/.env` setzen:
   ```
   DEPLOY_SECRET=<zufälliges Secret>
   DEPLOY_DIR=/var/www/lehrer-homepage
   PM2_APP=kolosseum
   ```
2. In den GitHub-Repository-Einstellungen unter *Webhooks*:
   - Payload URL: `https://kolosseum.lehrer-herrmann.de/api/deploy`
   - Content type: `application/json`
   - Secret: dasselbe wie `DEPLOY_SECRET`
   - Event: *Just the push event*

---

## Formspree-Einrichtung

Das Formular in `abgabe.html` benötigt eine Formspree-Form-ID:

1. Auf [formspree.io](https://formspree.io) registrieren
2. Neues Formular anlegen und Form-ID kopieren
3. `YOUR_FORM_ID` in `abgabe.html` (Zeile ~79) ersetzen:
   ```html
   <form action="https://formspree.io/f/abcd1234" method="POST" ...>
   ```

---

## Barrierefreiheit

Alle Änderungen müssen folgende Anforderungen erfüllen:
- Semantische HTML-Struktur
- ARIA-Labels auf interaktiven Elementen
- Sichtbare Fokus-Zustände für Tastaturnavigation
- Ausreichender Farbkontrast (WCAG AA mindestens)
- Keine Information nur durch Farbe vermitteln

---

## Was NICHT tun

- Kein npm, kein Bundler (webpack/vite), kein CSS-Präprozessor für die statische Seite
- Kein JavaScript-Framework (React, Vue, Alpine usw.) für die statische Seite
- Keine ARIA-Attribute oder semantische HTML-Elemente entfernen
- Keinen Text von Deutsch in eine andere Sprache ändern
- Keine globalen JavaScript-Variablen (IIFEs verwenden)
- Keine Farben hardcoden — vorhandene CSS-Variablen (`--farbe-*`) verwenden
- Keine zusätzlichen Dateien anlegen, wenn nicht klar nötig

---

## Interaktive Arbeitsblätter (AB-Generator)

Der `tools/ab_generator.py` beobachtet `upload/` alle 10 Sekunden, schickt neue Dateien (PDF, JPG, PNG, TXT, MD) an die Claude API und speichert die generierten interaktiven HTML-Arbeitsblätter in `materialien/`. Verarbeitete Originale werden nach `upload/_erledigt/` verschoben. Nach der Generierung committed und pusht das Skript automatisch auf `main`.

### Ablageort und Verlinkung

Generierte Arbeitsblätter gehören nach `materialien/`. Sie werden in `portal.html` und auf `index.html` im Abschnitt `#digitale-materialien` verlinkt (manuell oder per `inhalte.json`).

**Wichtig**: Jede generierte AB-Datei muss `js/auth-guard.js` im `<head>` einbinden:
```html
<script src="/js/auth-guard.js"></script>
```

### Ausgabeformat

Jede generierte Datei ist eine vollständige Standalone-HTML-Datei mit:
- Eingebettetem CSS (kein externes Stylesheet)
- Eingebettetem JavaScript (keine externen Bibliotheken außer ggf. cdn.jsdelivr.net)
- Responsivem Design (funktioniert auf Schüler-Smartphones)
- `auth-guard.js`-Einbindung im `<head>`

### Designsystem für Arbeitsblätter

| Rolle | Wert | Verwendung |
|-------|------|------------|
| Primärfarbe | `#1e3a5f` | Überschriften, Buttons |
| Akzentfarbe | `#4a9eda` | Links, Fokus-Zustände |
| Korrekt-Feedback | `#2ecc71` | Grün bei richtiger Antwort |
| Fehler-Feedback | `#e74c3c` | Rot bei falscher Antwort |
| Hintergrund | `#f4f6f7` | Seiten-Hintergrund |
| Karten-Hintergrund | `#ffffff` | Aufgaben-Karten |

Weitere Vorgaben: Schriftart `system-ui, sans-serif`, `border-radius: 8px`, `box-shadow` auf Karten, maximale Breite `800px` zentriert.

### AB-Typen und Umsetzung

| Typ | Umsetzung |
|-----|-----------|
| **Lückentext** | Input-Felder inline, Auswertung per Button, Feedback pro Lücke + Gesamtpunktzahl |
| **Multiple Choice** | Radio-Buttons oder Checkboxen, klares Feedback nach Abgabe, kein Mehrfachversuch ohne Reset |
| **Zuordnung** | Drag & Drop oder Dropdown-Menüs je nach Komplexität |
| **Textanalyse / offen** | Textarea mit Zeichenzähler, Musterlösung aufklappbar |
| **Schreibaufgabe** | Strukturierte Textfelder mit Hilfestellungen, optionale Bewertungsrubrik |
| **Sonstiges** | Typ selbst erkennen, passendste interaktive Umsetzung wählen |

### Metadaten-Header

Jede generierte HTML-Datei beginnt mit:
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
