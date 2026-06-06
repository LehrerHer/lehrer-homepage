# CLAUDE.md — AI Assistant Guide for lehrer-homepage

This file provides context for AI assistants (e.g., Claude Code) working on this repository.

---

## Project Overview

**lehrer-homepage** is a static teacher homepage for Jan Herrmann at Oberschule Spelle (Lower Saxony, Germany). It consists of HTML pages, one CSS file, and JavaScript files — no build tools, frameworks, or package managers are used.

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
│   ├── main.js          # All site JavaScript
│   └── homepage-gate.js # Auth-Gate: blendet geschützte Sektionen ein/aus
├── materialien/         # Generated interactive worksheets (HTML)
├── Material manuell von mir/  # Source files uploaded manually by Jan Herrmann (PPTX, images, etc.)
├── upload/              # Drop folder for raw worksheet files
│   └── _erledigt/       # Processed originals (moved here after conversion)
├── reso-selbsttest.html # RESO Rechtschreibdiagnostik: Schüler-Selbsttest (5 Varianten × 35 Items)
├── reso-lehrkraft.html  # RESO Rechtschreibdiagnostik: Lehrkraft-Dashboard
├── reso-backend/        # RESO API-Backend (FastAPI + SQLite, läuft als systemd-Service)
│   ├── api.py           # FastAPI-App, Endpunkte: /klasse, /klassen, /ergebnis, /ergebnisse
│   ├── requirements.txt # Python-Abhängigkeiten (fastapi, uvicorn, pydantic)
│   ├── reso-api.service # systemd-Servicedatei
│   ├── nginx-snippet.conf # (veraltet – Server nutzt Caddy, nicht nginx)
│   └── setup.sh         # Einmaliges Server-Setup-Skript
├── kolosseum/           # Lernkolosseum (geschützter Bereich, Node.js-Backend)
│   ├── public/
│   │   ├── profil.html
│   │   ├── rangliste.html
│   │   └── admin/
│   │       ├── index.html
│   │       ├── link-erstellen.html
│   │       ├── material-hochladen.html
│   │       └── xp-vergabe.html
│   └── routes/
│       └── external.js  # XP-Berechnung (computeNotenpunkte)
└── tools/
    ├── ab_generator.py  # Watch-loop: upload/ → Claude API → materialien/ → git push
    └── requirements.txt # Python dependencies (anthropic)
```

There are no build tools, transpilation steps, or generated output folders beyond `materialien/`.

### Manuell bereitgestellte Quelldateien (`Material manuell von mir/`)

Dieser Ordner enthält Dateien, die Jan Herrmann direkt hochgeladen hat (z. B. PowerPoint-Präsentationen, Bilder, HTML-Entwürfe). Er liegt im GitHub-Repository unter dem Pfad `Material manuell von mir/`.

**WICHTIG für Claude:** Bevor du bei einem Auftrag wie „Erstelle ein Arbeitsblatt / eine Präsentation / ein Lernmaterial zu Thema X" Inhalte aus dem Nichts generierst, **durchsuche zuerst diesen Ordner auf GitHub** (`mcp__github__get_file_contents` mit `path: "Material manuell von mir"`). Dort liegende Quelldateien (z. B. `.pptx`, `.pdf`, `.jpg`) sind als Vorlage zu verwenden und in das Zielformat (interaktives HTML in `materialien/`) zu überführen. Erst wenn dort nichts Passendes liegt, darfst du Inhalte eigenständig generieren.

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

## Globale Layout-Komponenten (verbindlich auf JEDER Seite)

### Header / Navbar

Die Navbar erscheint **auf jeder einzelnen Seite** – sowohl auf der Hauptdomain als auch im Kolosseum (Subdomain). **Keine Seite darf einen abweichenden Header haben.**

#### Navbar-Elemente (von links nach rechts)

| Element | Ziel | CSS-Klasse |
|---|---|---|
| **lehrer-herrmann.de** | `index.html` (Startseite) | `.navbar-logo` |
| **Was ist neu?** | `index.html#was-ist-neu` | `.navbar-links a` |
| **Kontakt** | `https://lehrer-herrmann.de/kontakt.html` | `.navbar-links a` |
| *(Trenner „Geschützter Bereich")* | — | `.navbar-gb-trenner` + `.navbar-gb-label` |
| **⚔️ Arena** | `https://kolosseum.lehrer-herrmann.de/profil.html` | `.navbar-gb-link` |
| **✍️ Blog** | `blog.html` | `.navbar-gb-link` |
| **📚 Fächer** | `faecher.html` | `.navbar-gb-link` |
| *(Login-Widget)* | — | `#kolosseum-widget` |

#### Verbindliches HTML-Snippet (Hauptdomain-Seiten)

```html
<nav class="navbar" role="navigation" aria-label="Hauptnavigation">
    <div class="container navbar-inner">

        <a href="index.html" class="navbar-logo">lehrer-herrmann.de</a>

        <button
            class="hamburger"
            id="hamburger"
            aria-label="Menü öffnen"
            aria-expanded="false"
            aria-controls="navbar-links"
        >
            <span></span>
            <span></span>
            <span></span>
        </button>

        <ul class="navbar-links" id="navbar-links">
            <li><a href="index.html#was-ist-neu">Was ist neu?</a></li>
            <li><a href="https://lehrer-herrmann.de/kontakt.html">Kontakt</a></li>
            <li class="navbar-gb-trenner" aria-hidden="true">
                <span class="navbar-gb-label">Geschützter Bereich</span>
            </li>
            <li><a href="https://kolosseum.lehrer-herrmann.de/profil.html" class="navbar-gb-link">⚔️ Arena</a></li>
            <li><a href="blog.html" class="navbar-gb-link">✍️ Blog</a></li>
            <li><a href="faecher.html" class="navbar-gb-link">📚 Fächer</a></li>
        </ul>

        <div id="kolosseum-widget" aria-label="Kolosseum-Anmeldung" style="display:none">
            <!-- Wird per js/kolosseum-login-widget.js befüllt -->
        </div>

    </div>
</nav>
```

Für **Unterverzeichnis-Seiten** (`materialien/`): relative Links mit `../` Prefix oder absolute Pfade (`/index.html`, `/blog.html`, `/faecher.html`).

Für **Kolosseum-Seiten** (`kolosseum.lehrer-herrmann.de`): alle Links als vollständige absolute URLs (`https://lehrer-herrmann.de/...`), Arena-Link als Relativ-Pfad (`/profil.html`).

#### CSS-Klassen der Navbar

| Klasse | Beschreibung |
|---|---|
| `.navbar-gb-trenner` | Vertikaler Trennstrich (auf Mobile: horizontale Linie) |
| `.navbar-gb-label` | Kleine Beschriftung „GESCHÜTZTER BEREICH" (amber/gold) |
| `.navbar-gb-link` | Amber/goldene Linkfarbe für Arena, Blog, Fächer |
| `#kolo-widget .kolo-user-chip` | CSS-Override: gelber Text auf dunkler Navbar (Widget inject eigene Styles) |

#### Erforderliche Scripts pro Seite

- Alle Seiten: `js/main.js` (Hamburger-Toggle, Footer-Jahr)
- Seiten mit Login-Widget: `js/kolosseum-login-widget.js`

### Footer

Der Footer erscheint ebenfalls **auf jeder Seite**. Er enthält:

- **Links:** `© [aktuelles Jahr] Jan Herrmann` | `Impressum` | `Datenschutz`
- **Rechts:** `Eingeloggt als [Avatarname], Rang [XP]` — und ((nahezu unsichtbar) dieser Text ist ein funktionierender Link zu `/kolosseum/public/admin/`, mit minimalem Kontrast (z. B. `color: rgba(0,0,0,0.15)` auf weißem Grund). Wenn kein Nutzer eingeloggt ist: unsichtbar / leer.

Das Copyright-Jahr wird dynamisch via `id="footer-jahr"` gesetzt (bereits implementiert in `js/main.js`).

---

## Seitenstruktur (vollständig)

```
Startseite (index.html)
├── Aufbau-Banner    → (.aufbau-banner) Hinweis zwischen Navbar und Bereiche-Kacheln
├── #startseite      → Bereiche-Übersicht: 6 Kacheln in dieser Reihenfolge:
│                      1. Fächervorstellung (öffentlich, klickbar → faecher.html)
│                      2. Arena – Lernkolosseum (🔒)
│                      3. Jan Herrmann – Wer bin ich? (öffentlich)
│                      4. Schüler*innenblog (🔒)
│                      5. Leseabenteuer (🔒)
│                      6. Materialien & Quizze (🔒)
├── #was-ist-neu     → Aktuelle Funktionen, Quiz-Leistungen, neue Materialien
├── Login-Gate       → sichtbar wenn NICHT eingeloggt
├── Lernkolosseum-Teaser → sichtbar wenn eingeloggt
├── Digitale Materialien → sichtbar wenn eingeloggt (mit Jahrgang-Filterleiste)
├── Blog-Teaser      → sichtbar wenn eingeloggt
├── #kontakt         → jan.herrmann AT obsspelle.de (E-Mail verschleiert)
└── Footer           → © Impressum · Datenschutz + versteckter Admin-Link

ÖFFENTLICH
├── faecher.html             → Fächer-Landingpage (alle Fächer, Link zum Materialportal)
└── Fächervorstellung (je ein eigener Bereich pro Hauptfach)
    ├── fach-deutsch.html    → Erklärung des Faches + Link zur Seite Materialien des entsprechenden Faches
    ├── fach-geschichte.html    → Erklärung des Faches + Link zur Seite Materialien des entsprechenden Faches
    ├── fach-wipo.html              (Wirtschaft/Politik)     → Erklärung des Faches + Link zur Seite Materialien des entsprechenden Faches
    ├── fach-informatik.html     → Erklärung des Faches + Link zur Seite Materialien des entsprechenden Faches
    ├── fach-werte-normen.html     → Erklärung des Faches + Link zur Seite Materialien des entsprechenden Faches
    ├── fach-andere.html            (Mathe, Englisch, Sport, Bio, Chemie, Physik, Musik,
    │                                Erdkunde, Gestaltendes Werken) → Erklärung der Fächer + Links zur Seite Materialien des jeweiligen Faches
    └── fach-ag-projekte.html    → Erklärung der Projekte und Arbeitsgemeinschaften + Link zur Seite Materialien des entsprechenden Faches

GESCHLOSSEN (Login via Kolosseum-Account erforderlich)
├── Materialien (portal.html)
│   ├── Deutsch        → Arbeitsblätter · Materialien · Quizze
│   ├── Geschichte     → Arbeitsblätter · Materialien · Quizze
│   ├── Wirtschaft/Politik → Arbeitsblätter · Materialien · Quizze
│   ├── Werte und Normen → Arbeitsblätter · Materialien · Quizze
│   ├── Informatik → Arbeitsblätter · Materialien · Quizze
│   ├── Gestaltendes Werken → Arbeitsblätter · Materialien · Quizze
│   ├── Mathematik     → Arbeitsblätter · Materialien · Quizze
│   ├── Englisch    → Arbeitsblätter · Materialien · Quizze
│   ├── Sport    → Arbeitsblätter · Materialien · Quizze
│   ├── Biologie    → Arbeitsblätter · Materialien · Quizze
│   ├── Chemie    → Arbeitsblätter · Materialien · Quizze
│   ├── Physik    → Arbeitsblätter · Materialien · Quizze
│   ├── Musik    → Arbeitsblätter · Materialien · Quizze
│   ├── Erdkunde     → Arbeitsblätter · Materialien · Quizze   
│   └── AGs & Projekte → Arbeitsblätter · Materialien · Quizze
├── Schüler*innenblog (blog.html)
│   └── blog-einreichen.html
└── Lernkolosseum
    ├── Übersicht/Landing (kolosseum.html) → auth-guard.js
    ├── Profil (kolosseum/public/profil.html) ← primäres Ziel aller „Zur Arena"-Links
    ├── Rangliste (kolosseum/public/rangliste.html)
    ├── Arena / Quiz-Spiel
    └── Admin-Ebene (kolosseum/public/admin/) ← Zugang nur via verstecktem Footer-Link
        ├── Einladungslink erstellen
        ├── Material hochladen
        └── Manuelle XP-Vergabe
```

### Zugangslogik (`js/homepage-gate.js`)

- Prüft Kolosseum-Session via `GET /api/auth/me`
- **Eingeloggt:** Lernkolosseum-Teaser, Materialien-Sektion und Blog-Teaser werden eingeblendet; Login-Gate ausgeblendet
- **Nicht eingeloggt:** Login-Gate sichtbar; geschützte Sektionen ausgeblendet
- `#bereiche-uebersicht` ist **immer öffentlich** sichtbar, zeigt geschlossene Bereiche mit **„🔒 Login nötig"**

### Link-Ziel für Lernkolosseum

- Alle „Zur Arena"-Links (Bereiche-Übersicht, Lernkolosseum-Teaser, Navbar) → **`kolosseum/public/profil.html`**
- `kolosseum.html` ist sekundäre Übersichtsseite (via `auth-guard.js` geschützt)
- Öffentlich vorgelagerte Demo-Inhalte ohne Login: noch nicht vorhanden, werden später bewusst ergänzt

### XP-Berechnung: Externe Quizze (Notenpunkte-System)

XP werden nach dem Notenpunkte-System der gymnasialen Oberstufe vergeben:

**XP = Notenpunkte × Anzahl gespielter Fragen**

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

XP werden nur bei **Verbesserungen** gutgeschrieben (Differenz zum bisherigen Bestergebnis). Berechnung: serverseitig in `kolosseum/routes/external.js` (`computeNotenpunkte`), clientseitig (Gast-Vorschau) in `js/kolosseum-prompt.js`.

---

## Key Files and Their Roles

### `index.html`
- **Sektionsreihenfolge:** Navbar → Aufbau-Banner (`.aufbau-banner`) → Bereiche-Übersicht (`#startseite`, `.bereiche-uebersicht-section`) → `#was-ist-neu` → Gladiatoren-Teaser → Login-Gate → `#lernkolosseum` → `#digitale-materialien` → Blog-Teaser → `#kontakt` → Footer
- **Bereiche-Grid:** 6 Kacheln in fester Reihenfolge:
  1. **Fächervorstellung** (öffentlich) — alle 15 Fächer als Pill-Chips; Klick auf Chip → Fachseite; Klick auf Karte → `faecher.html`; umgesetzt via `.bereich-karte-klickbar` + `onclick="if(!event.target.closest('a'))location.href='faecher.html'"`
  2. **Arena – Lernkolosseum** (🔒 Login)
  3. **Jan Herrmann – Wer bin ich?** (öffentlich)
  4. **Schüler\*innenblog** (🔒 Login)
  5. **Leseabenteuer** (🔒 Login)
  6. **Materialien & Quizze** (🔒 Login)
- Digitalematerialien-Sektion: Jahrgang-Filterleiste (`.dm-filter-leiste`) über dem Grid; Karten tragen `data-jahrgang="5-6|7-8|9-10"` Attribute
- `id="startseite"` sitzt auf der `<section class="bereiche-uebersicht-section">` (kein Hero mehr)
- Copyright year dynamisch via `id="footer-jahr"`
- Scripts: `main.js`, `dynamic-content.js`, `homepage-gate.js`, `kolosseum-login-widget.js`

### `faecher.html`
- Landingpage für alle Unterrichtsfächer (Navbar-Link „📚 Fächer")
- Drei Gruppen: Hauptfächer (Deutsch, Geschichte, WiPo, Informatik, W&N), Weitere Fächer (Mathe, Englisch, Sport, Bio, Chemie, Physik, Musik, Erdkunde, Gestaltendes Werken), AGs & Projekte
- Jede Fachkarte verlinkt auf die entsprechende `fach-*.html`-Seite (Hauptfächer) oder `fach-andere.html` (weitere Fächer)
- CTA-Box am Ende mit Link zum Materialportal (`portal.html`)

### `abgabe.html`
- Student assignment upload form, Formspree-Integration
- `YOUR_FORM_ID` in Zeile ~68 durch echte Formspree-ID ersetzen
- `noindex, nofollow` — bewusst aus Suchmaschinen ausgeschlossen
- Akzeptierte Dateitypen: PDF, JPG, PNG, DOCX, ZIP (max. 10 MB)

### `js/main.js`
Vier eigenständige IIFE-Module:

| Modul | Zweck |
|-------|-------|
| Hamburger-Menü | Mobile-Nav-Toggle mit ARIA (`id="hamburger"` ↔ `id="navbar-links"`) |
| Scroll-Spy-Nav | Aktiven Nav-Link beim Scrollen hervorheben |
| Footer-Jahr | Aktuelles Jahr in `id="footer-jahr"` setzen |
| Abgabe-Formular | Validierung + Fetch-Submit (nur auf `abgabe.html`) |

### `js/kolosseum-login-widget.js`
- Zeigt Login-Status in `#kolosseum-widget` (wird von `id="kolosseum-widget"` zu `id="kolo-widget"` umbenannt)
- Eingeloggt → `.kolo-user-chip` mit Avatar-Emoji + Gladiatorenname (Link → Profil)
- Ausgeloggt → `.kolo-login-btn` „🏛️ Einloggen"
- Injiziert eigene `<style>` ins `<head>` — wird von `#kolo-widget .kolo-user-chip { color: #FFE66D !important }` in `style.css` überschrieben (Lesbarkeit auf dunkler Navbar)

### `css/style.css`
CSS Custom Properties (`:root`):
- `--farbe-primaer: #1e3a5f` (Dunkelblau)
- `--farbe-primaer-hell: #2d6a9f` (Mittleres Blau)
- `--farbe-akzent: #4a9eda` (Hellblau)
- `--farbe-hintergrund: #f4f6f9` (Seitenhintergrund)
- `--farbe-weiss`, `--farbe-text`, `--farbe-text-hell`, `--farbe-rahmen`, `--farbe-erfolg`
- `--schatten`, `--radius`, `--transition`

Responsive Breakpoints: `768px` (Tablet), `480px` (Mobil). Layout: CSS Grid + Flexbox.

Wichtige CSS-Klassen (ab 2026-05):
- `.navbar-gb-trenner` / `.navbar-gb-label` — Trenner + Beschriftung „Geschützter Bereich"
- `.navbar-gb-link` — amber/goldene Links (Arena, Blog, Fächer)
- `#kolo-widget .kolo-user-chip` — Farb-Override für eingeloggten Gladiatorennamen
- `.bereich-karte-klickbar` — `cursor: pointer` für Kacheln, die per `onclick` navigieren (ohne `<a>`-Wrapper)

**Hinweis Kolosseum-CSS** (`kolosseum/public/css/style.css`): Der Kolosseum-Server lädt seine eigene CSS-Datei, nicht die Haupt-`style.css`. Navbar-Stile sind daher dort separat mit hardcodierten Farbwerten dupliziert. Bei Navbar-CSS-Änderungen in `css/style.css` immer auch `kolosseum/public/css/style.css` am Ende (Abschnitt „SITE NAVBAR") aktualisieren.

---

## Coding Conventions

### HTML
- `lang="de"`, alle sichtbaren Texte auf Deutsch
- Semantische Elemente: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`
- ARIA-Attribute auf interaktiven Elementen
- Icons: Unicode-Emoji (keine Icon-Fonts, keine SVGs)
- IDs: `kebab-case`, passend zu JavaScript-Selektoren

### CSS
- **Kein Präprozessor** — reines CSS
- CSS-Variablen für alle Wiederholungswerte
- Klassen: `kebab-case`, semantisch
- Section-Kommentare: `/* === ABSCHNITTSNAME === */`
- Keine Utility-Classes, kein CSS-Framework

### JavaScript
- **Kein Framework, kein npm** — Vanilla ES6+
- Jedes Feature: IIFE `(function() { ... })()`
- Keine globalen Variablen
- Benennung: Deutsch für fachliche Konzepte, Englisch für Code-Konstrukte
- Async: `fetch` mit `async/await`
- Fehlerbehandlung: `try/catch` mit deutschen Fehlermeldungen
- DOM-Zugriff: `querySelector` / `querySelectorAll`

---

## Development Workflow

### Änderungen vornehmen
1. Dateien direkt bearbeiten — kein Build-Schritt
2. Browser-Refresh zum Testen
3. Auf mehreren Viewport-Breiten testen: Desktop, Tablet (`768px`), Mobil (`480px`)

### Keine Tests oder Linting
- Kein Test-Suite, kein CI/CD, kein Linter
- HTML manuell oder mit W3C Validator prüfen
- JavaScript im Browser-DevTools-Console prüfen

### Git — PFLICHTREGELN FÜR CLAUDE

- **NIE direkt auf `main` committen oder pushen.** Kein einziger Commit darf direkt auf `main` landen.
- **Immer auf dem zugewiesenen Feature-Branch arbeiten.** Branch-Schema: `claude/<beschreibung>-<session-id>`. Falls noch nicht lokal vorhanden: `git checkout -b claude/<beschreibung>-<id>`.
- **Kein `git reset --hard main`**, kein Merge von `main` in den Feature-Branch ohne explizite Nutzeraufforderung.
- **Kein Force-Push auf `main`** — unter keinen Umständen.
- Nach Abschluss: Feature-Branch pushen (`git push -u origin <branch>`), dann den Nutzer fragen, ob gemergt werden soll. **Nie selbst mergen**, außer auf ausdrückliche Aufforderung.
- Commit-Befehl immer mit `-c user.email="jan@lehrer-herrmann.de" -c user.name="Jan Herrmann"`
- Commit-Nachrichten auf Deutsch oder Englisch

### Deploy — vollautomatisch via GitHub-Webhook

Der Server (`178.105.35.83`) zieht automatisch bei jedem Push auf `main`. **Kein manueller SSH-Befehl nötig.**

Einmalige Einrichtung (nur wenn Webhook noch nicht aktiv):
1. Auf dem Server in `/var/www/lehrer-homepage/kolosseum/.env` setzen:
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

### Server-Infrastruktur (Stand 2026-05)

**Webserver: Caddy** (kein nginx!) — Config unter `/etc/caddy/Caddyfile`:

```
lehrer-herrmann.de, www.lehrer-herrmann.de {
    root * /var/www/lehrer-homepage
    handle /reso-api/* {
        uri strip_prefix /reso-api
        reverse_proxy localhost:8400
    }
    file_server
}

kolosseum.lehrer-herrmann.de {
    reverse_proxy localhost:3000
}
```

Caddy neu laden nach Änderungen: `systemctl reload caddy`

**RESO API** läuft als systemd-Service auf Port `8400`:
- Service-Name: `reso-api`
- Prozess: `/opt/reso/venv/bin/uvicorn api:app --host 127.0.0.1 --port 8400`
- Datenbank: `/opt/reso/reso.db` (SQLite)
- Token: in `/etc/systemd/system/reso-api.service` unter `RESO_TOKEN=...`
- Neustart nach Token-Änderung: `systemctl daemon-reload && systemctl restart reso-api`
- Erreichbar von außen: `https://lehrer-herrmann.de/reso-api/`

**Kolosseum-Backend** (Node.js/PM2): läuft auf Port `3000`

---

## Formspree Setup

1. Account anlegen auf [formspree.io](https://formspree.io)
2. Neues Formular erstellen, Form-ID kopieren
3. In `abgabe.html` (Zeile ~68) ersetzen:
   ```html
   <!-- Vorher -->
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" ...>
   <!-- Nachher -->
   <form action="https://formspree.io/f/abcd1234" method="POST" ...>
   ```

---

## Accessibility Requirements

Alle Änderungen müssen sicherstellen:
- Semantische HTML-Struktur
- ARIA-Labels auf interaktiven Elementen
- Sichtbare Fokus-Zustände für Tastaturnavigation
- Ausreichender Farbkontrast (WCAG AA)
- Keine Information ausschließlich durch Farbe vermittelt

**Ausnahme (bewusst):** Der versteckte Admin-Link im Footer hat absichtlich minimalen Kontrast — das ist kein Accessibility-Fehler, sondern ein Feature.

---

## What NOT to Do

- Kein npm, kein Bundler (webpack/vite), kein CSS-Präprozessor einführen
- Kein JavaScript-Framework (React, Vue, Alpine etc.)
- Keine zusätzlichen Dateien anlegen, wenn nicht klar notwendig
- Keine ARIA-Attribute oder semantischen HTML-Elemente entfernen
- Keinen Text von Deutsch in eine andere Sprache ändern
- Keine globalen JavaScript-Variablen (IIFEs verwenden)
- Keine Farben hardcoden — bestehende CSS-Variablen verwenden
- Header oder Footer auf keiner Seite weglassen oder abweichend gestalten

---

## RESO Rechtschreibdiagnostik (Stand 2026-05)

RESO ist ein eigenständiges Diagnosesystem für den Deutschunterricht. Es besteht aus drei Teilen:

### Schüler-Selbsttest (`reso-selbsttest.html`)
- Öffentlich erreichbar unter `https://lehrer-herrmann.de/reso-selbsttest.html`
- 5 Varianten × 35 Items, 7 Rechtschreibkategorien (Doppelkonsonanten, s/ß/ss, Auslautverhärtung, ä/äu, Zusammensetzungen, Ableitungen/Vorsilben, Groß-/Kleinschreibung)
- Schüler:innen geben Klassencode + Namen ein → wählen Variante → Multiple-Choice-Test → Ergebnis → optional an Lehrkraft senden (POST an `/reso-api/ergebnis`)
- API-URL ist fest eingebaut: `https://lehrer-herrmann.de/reso-api`

### Lehrkraft-Dashboard (`reso-lehrkraft.html`)
- Öffentlich erreichbar unter `https://lehrer-herrmann.de/reso-lehrkraft.html`
- Login via **Lehrkraft-Token** (Bearer-Token, wird im Header mitgeschickt)
- 4 Tabs: Ergebnisliste · Klassenheatmap · Schülerprofil · Klassen verwalten
- Klassen anlegen → Code kopieren → an Schüler:innen weitergeben

### Backend (`reso-backend/api.py`)
- FastAPI + SQLite, läuft als systemd-Service `reso-api` auf Port 8400
- Proxy via Caddy: `https://lehrer-herrmann.de/reso-api/` → `localhost:8400`
- **Wichtige Endpunkte:**

| Methode | Pfad | Auth | Zweck |
|---------|------|------|-------|
| POST | `/klasse` | ✅ Token | Neue Klasse anlegen |
| GET | `/klassen` | ✅ Token | Alle Klassen abrufen |
| POST | `/ergebnis` | ❌ öffentlich | Schülerergebnis einreichen |
| GET | `/ergebnisse/{code}` | ✅ Token | Ergebnisse einer Klasse |
| DELETE | `/ergebnis/{id}` | ✅ Token | Ergebnis löschen |
| DELETE | `/klasse/{code}` | ✅ Token | Klasse löschen |

### Token ändern (per SSH)
```bash
sed -i 's/RESO_TOKEN=alterToken/RESO_TOKEN=neuerToken/' /etc/systemd/system/reso-api.service
systemctl daemon-reload && systemctl restart reso-api
```

---

## Interaktive Arbeitsblätter (Worksheet-Generator)

Dieser Assistent unterstützt Jan Herrmann und sein Kollegium dabei, hochgeladene Arbeitsblätter (PDF, Bild oder Text) in interaktive, eigenständige HTML-Dateien umzuwandeln.

### Ablageort

Generierte Dateien → `materialien/`. Verlinkung von `index.html` im Abschnitt `#materialien`.

### Ausgabeformat

Jede Datei: vollständige standalone HTML-Datei mit eingebettetem CSS und JS, kein externes Stylesheet, responsiv (funktioniert auf Schüler-Smartphones).

**Ausnahme:** Worksheets, die auf `/css/style.css` referenzieren (ältere Dateien in `materialien/`), bekommen auch die Standard-Navbar (mit `/index.html`-Pfaden) und `main.js` + `kolosseum-login-widget.js` als Scripts.

### Designsystem für Arbeitsblätter

| Rolle             | Wert      | Verwendung                        |
|-------------------|-----------|-----------------------------------|
| Primärfarbe       | `#1e3a5f` | Überschriften, Buttons            |
| Akzentfarbe       | `#4a9eda` | Links, Fokus-Zustände             |
| Korrekt-Feedback  | `#2ecc71` | Grün bei richtiger Antwort        |
| Fehler-Feedback   | `#e74c3c` | Rot bei falscher Antwort          |
| Hintergrund       | `#f4f6f7` | Seiten-Hintergrund                |
| Karten-Hintergrund| `#ffffff`  | Aufgaben-Karten                   |

Weitere Vorgaben: `system-ui, sans-serif`, `border-radius: 8px`, `box-shadow` auf Karten, max. Breite `800px` zentriert.

### AB-Typen und ihre Umsetzung

| Typ | Umsetzung |
|-----|-----------|
| **Lückentext** | Input-Felder inline im Text, Auswertung per Button, Feedback pro Lücke + Gesamtpunktzahl |
| **Multiple Choice** | Radio/Checkboxen, klares Feedback nach Abgabe, kein Mehrfachversuch ohne Reset |
| **Zuordnung** | Drag & Drop oder Dropdowns je nach Komplexität |
| **Textanalyse / offen** | Textarea mit Zeichenzähler, Musterlösung aufklappbar (zunächst verborgen) |
| **Schreibaufgabe** | Strukturierte Textfelder mit Hilfestellungen, optionale Bewertungsrubrik |
| **Sonstiges** | Typ selbst erkennen, passendste interaktive Umsetzung wählen |

### XP, Bestenliste & Lösungsanzeige (verbindlich für ALLE Quizze)

Jedes Quiz (insbesondere die „stummen Karten" in `materialien/erdkunde_*`) muss folgende Mechanik enthalten – Vorlage: `materialien/erdkunde_niedersachsen-landkreise_jg5-10_2026-05.html` und `materialien/erdkunde_bundeslaender_jg5-10_2026-05.html`:

1. **XP-Vergabe** über `js/kolosseum-prompt.js` → `window.kolosseumReport(score, total, 'quiz-slug')` (Notenpunkte-System). Skripte am Dateiende einbinden: `/js/supabase-config.js`, `/js/supabase-leaderboard.js`, `/js/kolosseum-prompt.js`.
2. **Bestenliste** über `js/supabase-leaderboard.js` (`leaderboardSave` / `leaderboardFetch` / `leaderboardHTML`), Namenseingabe + globale Top-10 nach Abschluss.
3. **Lösungsanzeige umschaltbar:** Der Button „Lösung zeigen" darf die eigenen Eingaben **nicht dauerhaft verstecken**. Er ist ein **Toggle** zwischen „Lösung" und „Meine Antworten zeigen", sodass Lernende beliebig hin- und herklicken und ihre Treffer mit der Lösung vergleichen können.
4. **Faire XP-Wertung:** Sobald die Lösung **das erste Mal** aufgedeckt wird, wird die XP-würdige Punktzahl auf den Stand **vor** der Hilfe eingefroren (`lockedScore = currentCorrect()`). XP und Bestenlisten-Eintrag zählen nur das, was **ohne** Lösungshilfe richtig war; ein Hinweis dazu wird im Ergebnis angezeigt.

### Metadaten-Header

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

---

## Template: Karten-Quiz (Bilderraten)

Für Quizze, bei denen Schüler:innen Bilder erraten (Fotos von Personen, Objekten, Orten etc.), existiert ein fertiges Template:

**`materialien/_template-karten-quiz.html`**

### Wann verwenden

Immer wenn Jan Herrmann ein neues Bilderraten-Quiz möchte (z. B. „Erstelle ein Flaggen-Quiz", „Mach ein Quiz mit Sportler-Fotos"). **Nie von Grund auf neu bauen** — immer dieses Template kopieren.

### Was bereits eingebaut ist

- Dunkles Design (Navbar, Hero, Card, Ergebnis-Screen, Footer)
- Auth-Guard (Login-Pflicht, Bypass via `?k=0fp5ma8`)
- Kolosseum-XP (`window.kolosseumReport`)
- Supabase-Bestenliste (`window.leaderboardSave/Fetch/HTML`)
- Levenshtein-Fuzzy-Matching (Tippfehler werden toleriert, +50 Punkte)
- SHA-256-Hash-Vergleich für exakte Antworten (+100 Punkte)
- **Safari-Fix 1:** Base64 → Blob-URL-Konvertierung (verhindert leere Bilder in Safari)
- **Safari-Fix 2:** `footer-jahr` Null-Check (verhindert TypeError → Skript-Abbruch in Safari)
- Kein `src=""` am `<img>` (kein unnötiger Netzwerkrequest)

### Was du anpassen musst

| Platzhalter | Bedeutung |
|---|---|
| `IMAGES` | Array mit Base64-Data-URLs (`data:image/jpeg;base64,...`) |
| `HASHES` | SHA-256-Hashes der normalisierten Antworten |
| `LABELS` | Korrekte Antworten im Klartext |
| `INFOS` | Objekte mit `flag`, `born`, `sport`, `highlights` |
| `PROMPTS` | Frage-Text pro Karte |
| `QUIZ_SLUG` | Eindeutiger Bezeichner (z. B. `'flaggen-quiz'`) |
| `QUIZ_TITEL_*` | Titel in Navbar `<title>` und Hero `<h1>` |
| `QUIZ_UNTERTITEL` | Untertitel im Hero |

### Hash erzeugen

Normalisierung der Antwort: `s.toLowerCase().replace(ä→ae, ö→oe, ü→ue, ß→ss)`  
Dann SHA-256 berechnen — Tool: https://emn178.github.io/online-tools/sha256.html

### Dateiname

```
fach_thema_jg5-10_JJJJ-MM.html
```

Beispiel: `geografie_flaggen-quiz_jg5-10_2026-07.html`

### Nach der Erstellung

Neue Quiz-Karte in der passenden `materialien-*.html` verlinken (`.mat-card` mit `.mat-badge.quiz`).
