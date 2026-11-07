# Quiz-Werkstatt für lehrer-herrmann.de – Wissensdatei für ein Claude-Projekt

> **Zweck:** Diese Datei wird als *Projektwissen* in ein Claude-Projekt (claude.ai) hochgeladen.
> Damit kann Claude dort neue Quizze für **lehrer-herrmann.de** erstellen, die ohne Nacharbeit auf der
> gemeinsamen Quiz-Engine der Homepage laufen.
> Stand: 2026-11-07 (abgeglichen mit `js/quiz-engine.js`, `materialien/quiz/*.json`,
> `kolosseum/routes/external.js`, `kolosseum/routes/leaderboard.js`).

---

## 0. Für Jan: So richtest du das Projekt ein

1. Auf claude.ai → **Projekte → Neues Projekt**, z. B. „Quiz-Werkstatt“.
2. Diese Datei unter **Projektwissen** hochladen.
3. Als **Projektanweisung** einfügen:

   ```text
   Du erstellst Quizze für lehrer-herrmann.de nach der Wissensdatei „CLAUDE-PROJEKT-QUIZZE.md“.
   Erfinde keine Fakten. Wenn Fach, Jahrgang, Quiz-Typ, Fragenanzahl oder Zugang (öffentlich/geschützt)
   unklar sind, frag nach – am liebsten mit Antwortoptionen zum Anklicken.
   Liefere am Ende immer das vollständige „Übergabepaket“ (Abschnitt 8) als Codeblöcke.
   ```

4. **Arbeitsablauf:**
   - Im Projekt: Thema/Material (PDF, Foto, Text, Stichworte) geben → Claude fragt nach, schreibt die
     Fragen und liefert das **Übergabepaket**.
   - Das Paket in eine **Claude-Code-Sitzung mit dem Repository** kopieren:
     „Bitte dieses Quiz einbauen“ – Claude Code legt die Dateien an, registriert das Quiz im Backend,
     verlinkt es, committet und erstellt den Pull Request.
   - Bilder (bei Bilderraten) und Karten (bei stummen Karten) direkt in der Claude-Code-Sitzung hochladen –
     das Claude-Projekt kann keine Dateien ins Repository legen.

---

## 1. Grundregeln für Claude in diesem Projekt

- **Nichts erfinden.** Fachinhalte nur aus dem gelieferten Material oder aus gesichertem Schulwissen.
  Bei Unsicherheit: nachfragen oder im Übergabepaket als „bitte prüfen“ markieren.
- **Alles auf Deutsch**, Zielgruppe Schüler*innen (Sek I, teils Grundschule/Oberstufe).
  Sprache dem Jahrgang anpassen, kurze klare Sätze.
- **Jede Frage bekommt eine `erklaerung`** (Begründung der richtigen Lösung) – Lernende sehen sie direkt
  nach der Antwort.
- **Ablenker (falsche Optionen) plausibel** wählen, nicht albern; keine „Alle obigen“-Optionen.
- **Vor dem Erstellen klären** (wenn nicht genannt): Fach · Jahrgang · Quiz-Typ · ungefähre Fragenanzahl ·
  öffentlich oder geschützt · Bestenliste ja/nein.
- Keine Emojis in Überschriften der Homepage; im Quiz selbst (Titel, Bewertungstexte, Intro) sind
  einzelne Emojis üblich und erlaubt.
- Gendern wie auf der Seite: **Schüler*innen**, **Lehrer*innen**.

---

## 2. Homepage-Architektur (was Claude wissen muss)

### 2.1 Überblick

| Teil | Technik | Adresse |
|---|---|---|
| Hauptseite | statisches HTML/CSS/Vanilla-JS, kein Build, kein npm, kein Framework | `https://lehrer-herrmann.de` |
| Lernkolosseum (Login, XP, Gladiatorenkämpfe, Bestenlisten-API) | Node.js/Express + SQLite, PM2, Port 3000 | `https://kolosseum.lehrer-herrmann.de` |
| Webserver | Caddy | – |
| Deploy | GitHub-Webhook: jeder Push/Merge auf `main` wird automatisch live geschaltet | – |

Repository: `lehrerher/lehrer-homepage` (GitHub). Gearbeitet wird nur auf Feature-Branches mit Pull Request.

### 2.2 Relevante Verzeichnisse

```
lehrer-homepage/
├── fach-<fach>.html          # EINE öffentliche Seite pro Fach: Vorstellung + komplette Materialliste
├── inhalte.json              # Einträge für „Was ist neu?“ auf der Startseite
├── materialien/
│   ├── <fach>_<thema>_<klasse>_<JJJJ-MM>.html   # HTML-Hülle des Quiz (wenige Zeilen)
│   └── quiz/<slug>.json                          # Quiz-Daten (Fragen, Optionen, Texte)
├── img/quiz/<slug>/          # Bilder eines Quiz (01.webp, 02.webp …; Karten: stumm.webp, loesung.webp)
├── js/
│   ├── quiz-engine.js        # gemeinsame Quiz-Engine (rendert alles aus der JSON)
│   ├── main.js               # Navbar/Footer-Umbau
│   ├── seitenleisten.js      # Inhaltsverzeichnis/Arena-Spalte auf großen Bildschirmen
│   ├── kolosseum-login-widget.js
│   ├── api-config.js · leaderboard.js   # Bestenliste
│   ├── kolosseum-prompt.js   # XP-Meldung an das Kolosseum
│   └── auth-guard.js         # Login-Schutz für geschützte Seiten
└── kolosseum/routes/
    ├── external.js           # XP-Registrierung: FRAGEN_QUIZZE
    └── leaderboard.js        # Bestenlisten-Registrierung: VALID_QUIZZES
```

### 2.3 Fachseiten (wo Quizze verlinkt werden)

Vorhandene Fachseiten:
`fach-deutsch` · `fach-geschichte` · `fach-wipo` · `fach-informatik` · `fach-werte-normen` · `fach-mathe` ·
`fach-englisch` · `fach-sport` · `fach-biologie` · `fach-chemie` · `fach-physik` · `fach-musik` ·
`fach-erdkunde` · `fach-gestaltendes-werken` · `fach-ag-projekte` · `fach-faecheruebergreifend`

Die **Liste** der Materialien auf der Fachseite ist öffentlich. Das Quiz selbst kann öffentlich oder
geschützt sein (siehe 2.4). Es gibt **keine** `materialien-<fach>.html` mehr.

### 2.4 Zugang: öffentlich oder geschützt

- **Öffentlich:** Hülle ohne `auth-guard.js` – jede*r kann spielen; XP gibt es trotzdem nur eingeloggt.
- **Geschützt:** `auth-guard.js` im `<head>` → nur mit Kolosseum-Login sichtbar.
  Optional mit **Geheimlink** `?k=<code>`: Wer den Link mit Code hat, darf ohne Login spielen.
  Den Code legt Claude Code fest (zufällige Zeichenfolge, z. B. 7 Zeichen) – nicht im Projekt erfinden.

### 2.5 XP im Lernkolosseum (Notenpunkte-System)

**XP = Notenpunkte × Anzahl gespielter Fragen** – gutgeschrieben wird nur die **Verbesserung**
gegenüber dem bisherigen Bestergebnis. Die Engine meldet das automatisch.

| NP | ab % | NP | ab % | NP | ab % | NP | ab % |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 15 | 95 | 11 | 75 | 7 | 55 | 3 | 33 |
| 14 | 90 | 10 | 70 | 6 | 50 | 2 | 27 |
| 13 | 85 | 9 | 65 | 5 | 45 | 1 | 20 |
| 12 | 80 | 8 | 60 | 4 | 40 | 0 | < 20 |

Beispiel: 10 Fragen, 9 richtig (90 %) → 14 NP × 10 = 140 XP.

### 2.6 Was die Engine automatisch erledigt (nicht selbst bauen!)

- Navbar und Footer der Homepage
- Startbildschirm, Fortschrittsbalken, Ergebnisansicht, „Nochmal spielen“, Zurück-Link
- XP-Meldung (`kolosseumReport(richtig, anzahlFragen, slug)`) – `total` ist immer die Fragenanzahl
- Bestenliste mit Namenseingabe und globalen Top 10
- „Lösung zeigen“ mit fairer Wertung: aufgedeckte Fragen zählen nicht für XP/Bestenliste
- Design (hell/dunkel), mobil nutzbar

**Ein neues Quiz besteht deshalb nur aus: einer JSON-Datei + einer kurzen HTML-Hülle + Registrierung.**
Kein eigenes CSS, kein eigenes JavaScript.

---

## 3. Die HTML-Hülle

Datei: `materialien/<fach>_<thema>_<klasse>_<JJJJ-MM>.html` – z. B. `geschichte_mittelalter-lehnswesen_7-8_2026-11.html`.

### 3.1 Öffentliches Quiz

```html
<!--
  Titel: <Titel>
  Fach: <Fach>
  Klasse/Niveau: <z. B. 7/8>
  AB-Typ: <MC / Bilderraten / Stumme Karte / Lückentext / Gemischt> – Quiz-Engine (js/quiz-engine.js), Daten: materialien/quiz/<slug>.json
  Erstellt: <JJJJ-MM-TT>
  Quelle: <z. B. Hochgeladenes Arbeitsblatt (PDF) / eigene Stichworte>
-->
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><Kurztitel> – Quiz – lehrer-herrmann.de</title>
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<main>
  <div id="quiz" data-quiz="/materialien/quiz/<slug>.json"></div>
</main>
<script src="/js/quiz-engine.js"></script>
<script src="/js/main.js?v=20260615c"></script>
<script src="/js/seitenleisten.js"></script>
<script src="/js/kolosseum-login-widget.js"></script>
<script src="/js/api-config.js"></script>
<script src="/js/leaderboard.js"></script>
<script src="/js/kolosseum-prompt.js"></script>
</body>
</html>
```

Wichtig:
- `quiz-engine.js` steht **vor** `main.js`, `seitenleisten.js` direkt **nach** `main.js` (immer mit aufnehmen).
- Den CSS-Link **ohne** `?v=…` ausgeben – die aktuelle Cache-Version ergänzt Claude Code beim Einbauen.

### 3.2 Geschütztes Quiz (Login, optional Geheimlink)

Zusätzlich direkt nach `<title>` im `<head>`:

```html
<script>
  if(!location.search.includes('k=<GEHEIMCODE>')){
    document.write('<scr'+'ipt src="/js/auth-guard.js"><\/scr'+'ipt>');
  }
</script>
```

Ohne Geheimlink genügt `<script src="/js/auth-guard.js"></script>`.

---

## 4. Die Quiz-JSON (`materialien/quiz/<slug>.json`)

### 4.1 Gemeinsame Felder (alle Typen)

| Feld | Pflicht | Bedeutung |
|---|:-:|---|
| `slug` | ✅ | Quiz-ID für XP und Bestenliste. Kleinbuchstaben, Bindestriche, keine Umlaute. Gleich dem Dateinamen der JSON. |
| `typ` | ✅ | `fragen` (Alias `mc`) · `bilder` · `karte` · `lueckentext` |
| `titel` | ✅ | Überschrift im Quiz |
| `untertitel` | – | z. B. `"Fach: Deutsch · Klasse 9/10 · 10 Fragen"` |
| `fach` | – | Fachkennung (z. B. `"deutsch"`), Konvention in allen Quizzen |
| `zurueck` | ✅ | `{ "url": "/fach-<fach>.html", "text": "Zurück zu <Fach>" }` |
| `intro` | – | Text vor dem Start; String oder Array von Absätzen, HTML erlaubt (`<strong>` …) |
| `bewertung` | – | Ergebnistexte: `[{ "ab": 100, "text": "…" }, { "ab": 70, … }, { "ab": 0, … }]` (Prozent, absteigend) |
| `design` | – | `{ "thema": "hell" \| "dunkel", "akzent": "#hex" }` – Bilderraten meist `dunkel` |
| `bestenliste` | – | `false` = keine Bestenliste |
| `loesungErlaubt` | – | `false` = kein „Lösung zeigen“-Knopf |
| `bestenlisteSlug` | – | abweichende Basis-ID für die Bestenliste (nur bei Konfiguration, siehe 4.3) |

### 4.2 Typ `fragen` – Frage für Frage (häufigster Typ)

Jede Frage hat ein Feld `art` (Standard `mc`). Gemeinsame Felder je Frage:
`frage` (HTML erlaubt) · `erklaerung` · optional `kontext` (Zitat/Beispielsatz über der Frage, HTML) ·
`hinweis` · `badge` (kleines Etikett, z. B. `"Kap. 2 · leicht"`) · `symbol` · `gewicht` (Punkte, Standard 1).

| `art` | Felder | Beispiel |
|---|---|---|
| `mc` | `optionen: [...]`, `richtig: 1` (Index ab 0) oder `richtig: [0,2]` (mehrere richtig) | siehe unten |
| `rf` | `richtig: true` / `false` (Richtig/Falsch-Aussage in `frage`) | `{"art":"rf","frage":"Filme mit Plot zählen zur Epik.","richtig":true,"erklaerung":"…"}` |
| `luecken` | `teile: [{ "text": "…", "antwort": "…" }]` – Teilpunkte | `{"art":"luecken","frage":"Ergänze:","teile":[{"text":"Wunderwelt, Gut gegen Böse:","antwort":"Märchen"}]}` |
| `zuordnung` | `paare: [{ "l": "links", "r": "rechts" }]` – Teilpunkte | `{"art":"zuordnung","frage":"Ordne zu.","paare":[{"l":"Ein Erzähler spricht","r":"Epik"},{"l":"Verteilte Rollen","r":"Dramatik"}]}` |
| `sortierung` | `elemente: [...]` in **richtiger** Reihenfolge, optional `akzeptiert: [[...]]` (weitere gültige Reihenfolgen) | `{"art":"sortierung","frage":"Bringe in die richtige Reihenfolge:","elemente":["A","B","C"]}` |
| `markierung` | `text` (Fließtext), `ziele: [...]` (Wörter/Wortgruppen, die angeklickt werden sollen – exakt wie im Text) | `{"art":"markierung","frage":"Markiere alle Verben.","text":"Der Hund bellt laut und rennt weg.","ziele":["bellt","rennt"]}` |
| `einfaerben` | `woerter: [{ "t": "Wortgruppe", "k": "kategorie" }]`, `kategorien: [{ "wert", "label", "farbe" }]` – zählt 1 Punkt je Wort(gruppe) | siehe unten |

**Beispiel `mc`:**
```json
{
  "frage": "Was versteht man unter dem Begriff „Prosa“?",
  "optionen": [
    "Texte in gebundener Sprache (Versen), wie zum Beispiel Gedichte.",
    "Alle Texte, die in freier, ungebundener Sprache verfasst sind.",
    "Theaterstücke, bei denen Figuren miteinander sprechen.",
    "Nur besonders kurze Texte."
  ],
  "richtig": 1,
  "erklaerung": "Prosa ist ungebundene Sprache – ohne Vers und Reim."
}
```

**Beispiel `einfaerben`:**
```json
{
  "art": "einfaerben",
  "frage": "Färbe die Satzglieder ein.",
  "woerter": [
    { "t": "Die kleine Katze", "k": "subjekt" },
    { "t": "spielt", "k": "praedikat" },
    { "t": "mit dem roten Ball", "k": "objekt" },
    { "t": "im Garten", "k": "adverbiale" }
  ],
  "kategorien": [
    { "wert": "subjekt", "label": "Subjekt", "farbe": "#e74c8b" },
    { "wert": "praedikat", "label": "Prädikat", "farbe": "#2ecc71" },
    { "wert": "objekt", "label": "Objekt", "farbe": "#e67e22" },
    { "wert": "adverbiale", "label": "Adverbiale Bestimmung", "farbe": "#9b59b6" }
  ]
}
```

**Quiz-Optionen für `fragen`** (oberste Ebene der JSON):

| Option | Bedeutung |
|---|---|
| `mischen` | Fragenreihenfolge zufällig (`true`/`false`) |
| `optionenMischen` | Antwortoptionen zufällig (`true`/`false`) – bei `false` auf zufällige Verteilung der richtigen Antwort achten |
| `anzahl` | nur so viele Fragen pro Durchgang ziehen |
| `teilpunkte` | `false` = nur vollständig richtige Aufgaben zählen (Standard: Teilpunkte) |
| `ablenker` | Zahl, z. B. `3`: falsche Optionen werden automatisch aus den Antworten anderer Fragen mit gleichem Feld `modus` gezogen; die Frage hat dann nur `antwort` statt `optionen` |
| `auswertungNach` | Feldname der Fragen (z. B. `"kapitel"`), nach dem das Ergebnis aufgeschlüsselt wird; dazu `auswertungTitel` und optional `auswertungLabels` |

Eigene Felder an Fragen (z. B. `kapitel`, `schwierigkeit`, `stufe`) sind erlaubt und werden für Filter
und Auswertung genutzt.

### 4.3 Konfigurationsbildschirm (nur `fragen`, für große Fragenpools)

Vor dem Start wählen Lernende Filter, Umfang und Modus:

```json
"konfiguration": {
  "gruppen": [
    { "feld": "kapitel", "label": "Kapitel", "art": "mehrfach",
      "optionen": [ { "wert": 1, "label": "Kap. 1", "beschreibung": "Was ist Literatur?" },
                    { "wert": 2, "label": "Kap. 2", "beschreibung": "Epik" } ] },
    { "feld": "schwierigkeit", "label": "Schwierigkeit", "art": "einfach", "alle": "Alle",
      "optionen": [ { "wert": "leicht", "label": "Leicht" }, { "wert": "mittel", "label": "Mittel" },
                    { "wert": "schwer", "label": "Schwer" } ] }
  ],
  "anzahl": { "label": "Anzahl Fragen", "optionen": [10, 25, "alle"], "standard": 10, "bestenliste": true }
}
```

- `art: "einfach"` = genau eine Option (optional `alle: "Alle"`), `"mehrfach"` = mehrere.
- Ohne `optionen` werden die Optionen automatisch aus den Werten der Fragen gebildet.
- `werte: [...]` in einer Option fasst mehrere Feldwerte zusammen.
- `modus: { "label", "optionen": [{ "wert", "label", "icon" }], "zufall": "mixed" }` filtert das Feld `modus` der Fragen.
- Gruppen/Anzahl/Modus mit `"bestenliste": true` bilden **getrennte Bestenlisten**:
  ID = `bestenlisteSlug` (oder `slug`) + `-` + gewählte Werte (z. B. `rechtschreib-56`).
  XP werden immer unter `slug` gemeldet.

### 4.4 Typ `bilder` – Bilderraten / Rebus

```json
{
  "slug": "kaefer-quiz",
  "typ": "bilder",
  "titel": "Käfer-Quiz – Bilderraten",
  "zurueck": { "url": "/fach-faecheruebergreifend.html", "text": "Zurück zu Fächerübergreifend" },
  "design": { "thema": "dunkel" },
  "bilder": "/img/quiz/kaefer-quiz/",
  "frage": "Wer oder was ist hier zu sehen?",
  "mischen": true,
  "versuche": 1,
  "toleranz": 3,
  "fragen": [
    { "bild": "01.webp", "antwort": "Gelbbrandkäfer", "alternativen": ["Gelbrandkäfer"],
      "info": { "zeilen": [["Lebensraum:", "Teiche & Seen"]],
                "wissenswertes": ["Lebt und jagt unter Wasser", "Kann trotzdem fliegen"] } }
  ]
}
```

Felder je Bild: `bild` (Dateiname im Ordner `bilder`) · `antwort` · `alternativen` · `frage` (überschreibt die
Standardfrage) · `tipp` (halbiert die Punkte) · `tipps: [...]` (gestaffelt, kostenlos) · `bonus` · `notiz` ·
`info: { zeilen: [[label, wert]], wissenswertes: [...], text (HTML) }` (Auflösung nach der Antwort).

Optionen: `mischen` (Standard an) · `versuche` 1–6 (jeder Fehlversuch halbiert) · `toleranz` (Tippfehler-Abstand
→ halbe Punkte, Standard 3, 0 = aus) · `toleranzVoll` (Tippfehler mit vollen Punkten) · `teilantworten`
(Nachname reicht) · `treffer: "stichwort"` (Schlüsselwort muss in der Antwort vorkommen) ·
`abschluss: { titel, hinweis, frage, antwort, alternativen, treffer, gewicht, erklaerung }` (Bonusfrage am Ende).

Bilder: WebP, nummeriert `01.webp`, `02.webp` … im Ordner `img/quiz/<slug>/`. **Keine Base64-Bilder.**
Bildrechte beachten (eigene Fotos, gemeinfreie oder frei lizenzierte Bilder).

### 4.5 Typ `karte` – stumme Karte

```json
{
  "slug": "erdkunde-bundeslaender",
  "typ": "karte",
  "titel": "Deutschland – Bundesländer",
  "zurueck": { "url": "/fach-erdkunde.html", "text": "Zurück zu Erdkunde" },
  "karte": { "stumm": "/img/quiz/erdkunde-bundeslaender/stumm.webp",
             "loesung": "/img/quiz/erdkunde-bundeslaender/loesung.webp" },
  "modi": ["leicht", "mittel", "schwer"],
  "fragen": [ { "antwort": "Baden-Württemberg", "x": 37.37, "y": 83.77 } ]
}
```

- `x`/`y` = Position des Punktes in **Prozent** der Bildbreite/-höhe. Diese Werte müssen an der echten
  Karte gemessen werden → im Projekt nur die Liste der Orte liefern, Koordinaten macht Claude Code mit dem Bild.
- `modi`: leicht = 4 Auswahloptionen, mittel = Begriffe zuordnen, schwer = freie Eingabe.
- Optional `gruppen: { "bl": { "name": "Bundesland", "farbe": "#185FA5" }, … }` und je Frage `"gruppe": "bl"`
  (Auswahloptionen nur aus derselben Gruppe).
- Vorlage im Repo: `materialien/_template-karten-quiz.html`.

### 4.6 Typ `lueckentext`

```json
{
  "slug": "deutsch-beispiel-lueckentext",
  "typ": "lueckentext",
  "titel": "…",
  "zurueck": { "url": "/fach-deutsch.html", "text": "Zurück zu Deutsch" },
  "genau": false,
  "fragen": [
    { "titel": "Abschnitt 1", "text": "Ein Gedicht besteht aus [Versen|Verszeilen]. Ein Roman ist {Epik|Lyrik|Dramatik}." }
  ]
}
```

- `[antwort|alternative]` = Eingabefeld (alle genannten Schreibweisen gelten).
- `{richtig|falsch|falsch}` = Auswahlfeld, **die erste Option ist die richtige** (wird gemischt, außer `optionenMischen: false`).
- `genau` (Standard `true`) = Groß-/Kleinschreibung zählt.
- Statt `fragen` geht auch ein einzelnes `"text": "…"`.

### 4.7 Wie gezählt wird

- Jede Frage = 1 Punkt; bei `fragen` zählt die Summe der `gewicht`-Werte (`einfaerben`: Anzahl der Wörter).
- Jede Lücke (`lueckentext`), jeder Kartenpunkt und jedes Bild = eine Frage.
- Bilderraten mit `abschluss`: Bilder + `gewicht` der Abschlussfrage.
- Diese **Höchstzahl** wird bei der Registrierung (Abschnitt 5) als `fragen` eingetragen.

---

## 5. Registrierung im Backend (Pflicht – sonst still keine XP / leere Bestenliste)

1. **XP:** `kolosseum/routes/external.js` → Objekt `FRAGEN_QUIZZE` ergänzen:
   ```js
   '<slug>': { fragen: <Höchstzahl aus 4.7>, label: '<Lesbarer Name>' },
   ```
2. **Bestenliste:** `kolosseum/routes/leaderboard.js` → Array `VALID_QUIZZES` muss die
   **Basis-ID vor dem ersten Bindestrich** enthalten (z. B. Slug `geschichte-lehnswesen` → `'geschichte'`).
   Bereits vorhanden (Stand 2026-11): `stilmittel`, `literaturwissenschaft`, `rechtschreib`, `deutsch`,
   `erdkunde`, `fussball`, `monatsnamen`, `lehrer`, `kaefer`, `masken`, `wintersport`, `lernquiz`.
   Bei `bestenlisteSlug` gilt dessen Basis-ID.

Ohne `bestenliste: false` braucht jedes Quiz beide Einträge.

---

## 6. Verlinkung und „Was ist neu?“

### 6.1 Auf der Fachseite (`fach-<fach>.html`, Kategorie „Quizze“)

```html
<a href="materialien/<datei>.html" class="mat-card">
    <span class="mat-badge quiz">Quiz</span>
    <div class="mat-title"><Titel></div>
    <div class="mat-desc"><Kurzbeschreibung> – <n> Fragen, XP &amp; Bestenliste. Klasse <x>.</div>
</a>
```

### 6.2 Eintrag in `inhalte.json` (oben im Array `materialien`)

```json
{
  "id": "<Datum als Millisekunden-Zeitstempel, z. B. 1788393600000 für 2026-09-02>",
  "titel": "<Titel> (Kl. <x>)",
  "beschreibung": "<ein Satz> – <n> Fragen, XP & Bestenliste",
  "icon": "<ein Emoji>",
  "url": "materialien/<datei>.html",
  "seite": "<fach, z. B. deutsch>",
  "datum": "<JJJJ-MM-TT>"
}
```

Das Wort „Quiz“ im Titel oder in der Beschreibung sorgt dafür, dass es unter „Quizze“ einsortiert wird.

---

## 7. Namenskonventionen

| Was | Muster | Beispiel |
|---|---|---|
| HTML-Hülle | `<fach>_<thema>_<klasse>_<JJJJ-MM>.html` | `deutsch_was-ist-prosa_9-10_2026-09.html` |
| Slug / JSON | `<fach>-<thema>` (klein, Bindestriche, ae/oe/ue/ss) | `deutsch-was-ist-prosa` → `materialien/quiz/deutsch-was-ist-prosa.json` |
| Bilder | `img/quiz/<slug>/01.webp` … | `img/quiz/kaefer-quiz/01.webp` |

Den Slug möglichst mit dem Fach beginnen (`deutsch-…`, `erdkunde-…`), dann ist die Basis-ID für die
Bestenliste oft schon registriert.

---

## 8. Übergabepaket (das liefert Claude im Projekt am Ende)

````markdown
## Übergabepaket: <Titel>

**Eckdaten:** Fach · Jahrgang · Typ · Fragen (Höchstzahl für XP) · öffentlich/geschützt · Bestenliste ja/nein

### 1. materialien/quiz/<slug>.json
```json
{ … vollständige JSON … }
```

### 2. materialien/<datei>.html
```html
… vollständige Hülle …
```

### 3. Backend
- external.js → FRAGEN_QUIZZE: `'<slug>': { fragen: <n>, label: '<Label>' },`
- leaderboard.js → VALID_QUIZZES: `'<basis>'` (falls noch nicht vorhanden)

### 4. fach-<fach>.html (Kategorie Quizze)
```html
<a …>…</a>
```

### 5. inhalte.json
```json
{ … }
```

### 6. Offene Punkte
- Bilder/Karte, die noch hochgeladen werden müssen
- Inhalte, die nicht eindeutig waren („bitte prüfen“)
- Annahmen zu Niveau/Jahrgang
````

**Vor der Ausgabe prüfen:**
- [ ] JSON gültig (keine Kommas am Ende, gerade Anführungszeichen `"` als JSON-Begrenzer, typografische „…“ nur im Text)
- [ ] `slug` identisch in JSON, Dateiname der JSON, `data-quiz`-Pfad, `FRAGEN_QUIZZE`
- [ ] `richtig`-Index stimmt (Zählung ab 0!) und die richtige Antwort ist nicht immer an derselben Stelle
- [ ] jede Frage hat eine `erklaerung`
- [ ] `fragen`-Höchstzahl richtig berechnet (4.7)
- [ ] `zurueck.url` zeigt auf die passende Fachseite
- [ ] Hülle: CSS-Link ohne `?v=…`, `seitenleisten.js` nach `main.js` enthalten

---

## 9. Tipps

- **Einfacher für Jan:** Wenn du ohnehin in Claude Code mit dem Repo arbeitest, kannst du das Quiz dort
  auch direkt in einem Schritt bestellen („Erstelle ein Quiz zu …“) – das Claude-Projekt lohnt sich vor allem,
  um Fragen in Ruhe auszuarbeiten, zu überarbeiten oder aus Material (PDF/Foto) zu gewinnen, ohne Repo-Sitzung.
- **Vorhandene Quizze als Vorlage** nennen (z. B. „wie das Prosa-Quiz“, „wie das Käfer-Quiz“) – dann ist
  sofort klar, welcher Typ und welcher Stil gemeint ist.
- **Modellwahl:** Für das Ausarbeiten von Fragen reicht meist ein schnelleres Modell (z. B. Sonnet);
  ein stärkeres Modell lohnt sich bei großen Fragenpools mit Konfiguration oder schwierigen Fachinhalten.
- **Größere Pools** (50+ Fragen) mit `konfiguration` (Kapitel/Schwierigkeit/Anzahl) anlegen statt
  mehrere kleine Quizze – eine Datei, eine Registrierung.
