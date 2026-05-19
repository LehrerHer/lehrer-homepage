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

### Header

Der Header ist eine wiederverwendbare Komponente und erscheint **auf jeder einzelnen Seite** – sowohl im öffentlichen als auch im geschlossenen Bereich (Lernkolosseum, Admin). Er enthält immer exakt diese Elemente in dieser Reihenfolge:

| Element | Ziel | Sichtbarkeit |
|---|---|---|
| **Jan Herrmann** | `/index.html` (Startseite) | immer |
| **Was ist neu?** | `index.html#was-ist-neu` | immer |
| **Kontakt** | `index.html#kontakt` | immer |
| **Geschützter Bereich** ▾ | Dropdown mit: Arena, Schüler\*innenblog, Materialien | immer (mit Login-Redirect falls nicht eingeloggt) |

Implementierung: Der Header wird als eigenständiges HTML-Partial eingebunden (z. B. per `fetch` + `innerHTML` in `js/main.js` oder als kopiertes Snippet). **Keine Seite darf einen abweichenden Header haben.**

### Footer

Der Footer erscheint ebenfalls **auf jeder Seite**. Er enthält:

- **Links:** `© [aktuelles Jahr] Jan Herrmann` | `Impressum` | `Datenschutz`
- **Rechts:** `Eingeloggt als [Avatarname], Rang [XP]` — und ((nahezu unsichtbar) dieser Text ist ein funktionierender Link zu `/kolosseum/public/admin/`, mit minimalem Kontrast (z. B. `color: rgba(0,0,0,0.15)` auf weißem Grund). Wenn kein Nutzer eingeloggt ist: unsichtbar / leer.

Das Copyright-Jahr wird dynamisch via `id="footer-jahr"` gesetzt (bereits implementiert in `js/main.js`).

---

## Seitenstruktur (vollständig)

```
Startseite (index.html)
├── #startseite      → Hero: Vorstellung „Wer bin ich?"
├── #was-ist-neu     → Aktuelle Funktionen, Quiz-Leistungen, neue Materialien
├── #bereiche-uebersicht → Links + kurze Erklärung zu allen Bereichen
│                         (immer öffentlich; geschlossene Bereiche mit 🔒-Hinweis)
├── Login-Gate       → sichtbar wenn NICHT eingeloggt
├── Lernkolosseum-Teaser → sichtbar wenn eingeloggt
├── Digitale Materialien → sichtbar wenn eingeloggt
├── Blog-Teaser      → sichtbar wenn eingeloggt
├── #kontakt         → jan.herrmann AT obsspelle.de (E-Mail verschleiert)
└── Footer           → © Impressum · Datenschutz + versteckter Admin-Link

ÖFFENTLICH
└── Fächervorstellung
    ├── fach-deutsch.html
    ├── fach-geschichte.html
    ├── fach-wipo.html              (Wirtschaft/Politik)
    ├── fach-informatik.html
    ├── fach-werte-normen.html
    ├── fach-andere.html            (Mathe, Englisch, Sport, Bio, Chemie, Physik, Musik,
    │                                Erdkunde, Gestaltendes Werken)
    └── fach-ag-projekte.html

GESCHLOSSEN (Login via Kolosseum-Account erforderlich)
├── Materialien (portal.html)
│   ├── Deutsch        → Arbeitsblätter · Materialien (Hilfen/Links) · Quizze
│   ├── Geschichte     → Arbeitsblätter · Materialien · Quizze
│   ├── Wirtschaft/Politik
│   ├── Werte und Normen
│   ├── Informatik
│   ├── Gestaltendes Werken
│   └── AGs & Projekte
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
- Sections: sticky navbar, hero (`#startseite`), was-ist-neu (`#was-ist-neu`), bereiche-übersicht (`#bereiche-uebersicht`), login-gate, lernkolosseum, digitalematerialien, blog-teaser, kontakt (`#kontakt`), footer
- Copyright year dynamisch via `id="footer-jahr"`

### `abgabe.html`
- Student assignment upload form, Formspree-Integration
- `YOUR_FORM_ID` in Zeile ~68 durch echte Formspree-ID ersetzen
- `noindex, nofollow` — bewusst aus Suchmaschinen ausgeschlossen
- Akzeptierte Dateitypen: PDF, JPG, PNG, DOCX, ZIP (max. 10 MB)

### `js/main.js`
Vier eigenständige IIFE-Module:

| Modul | Zweck |
|-------|-------|
| Hamburger-Menü | Mobile-Nav-Toggle mit ARIA |
| Scroll-Spy-Nav | Aktiven Nav-Link beim Scrollen hervorheben |
| Footer-Jahr | Aktuelles Jahr in Copyright setzen |
| Abgabe-Formular | Validierung + Fetch-Submit |

### `css/style.css`
CSS Custom Properties (`:root`):
- `--primary-color: #1e3a5f` (Dunkelblau)
- `--accent-color: #4a9eda` (Hellblau)
- `--transition`, `--border-radius`, `--shadow`

Responsive Breakpoints: `768px` (Tablet), `480px` (Mobil). Layout: CSS Grid + Flexbox.

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

## Interaktive Arbeitsblätter (Worksheet-Generator)

Dieser Assistent unterstützt Jan Herrmann und sein Kollegium dabei, hochgeladene Arbeitsblätter (PDF, Bild oder Text) in interaktive, eigenständige HTML-Dateien umzuwandeln.

### Ablageort

Generierte Dateien → `materialien/`. Verlinkung von `index.html` im Abschnitt `#materialien`.

### Ausgabeformat

Jede Datei: vollständige standalone HTML-Datei mit eingebettetem CSS und JS, kein externes Stylesheet, responsiv (funktioniert auf Schüler-Smartphones).

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
