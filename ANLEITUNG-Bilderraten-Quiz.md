# Anleitung: Bilderraten-Quiz erstellen

Diese Anleitung beschreibt Schritt für Schritt, wie ein neues interaktives Bilderraten-Quiz
(nach dem Vorbild des Wintersport-Legenden-Quiz) erstellt, in die Homepage eingebunden
und als Geheimlink für externe Personen zugänglich gemacht wird.

---

## Was du brauchst

- **12 Bilder** (JPG oder PNG, ca. 400×400 px oder größer), je eines pro Person/Objekt
- Für jedes Bild:
  - **Name** (exakt, wie er getippt werden soll, z. B. `Claudia Pechstein`)
  - **Kurz-Bio**: Geburtsort und -datum, Sport/Fach, 3–4 Highlights
  - **Flag-Emoji** des Landes, z. B. `🇩🇪`
- **Thema** und **Fach** für Dateiname und Kategorisierung
- Eine Vorstellung, auf **welcher Materialseite** das Quiz erscheinen soll
  (z. B. `materialien-sport.html`, `materialien-faecheruebergreifend.html`, …)

> Die Anzahl 12 kann auch auf 6, 8 oder 20 angepasst werden — dann `const N = 12;`
> im JS entsprechend ändern.

---

## Schritt 1 – Bilder als Base64 kodieren

Jedes Bild muss als Base64-String ins HTML eingebettet werden, damit die Datei
vollständig eigenständig läuft.

Entweder lokal mit Python:
```python
import base64
with open("bild.jpg", "rb") as f:
    print("data:image/jpeg;base64," + base64.b64encode(f.read()).decode())
```

Oder online: z. B. https://www.base64-image.de — Bild hochladen, String kopieren.

Alle 12 Base64-Strings werden später in das `IMAGES`-Array eingetragen.

---

## Schritt 2 – Antwort-Hashes erzeugen

Das Quiz prüft Antworten über SHA-256-Hashes (damit die Lösung nicht im Klartext im HTML steht).

Für jeden Namen den Hash des **kleingeschriebenen** Namens erzeugen.
Umlaute werden dabei normalisiert: ä→ae, ö→oe, ü→ue, ß→ss.

Python-Snippet für alle 12 Namen auf einmal:
```python
import hashlib

LABELS = [
    "Franz Klammer",
    "Claudia Pechstein",
    # ... alle Namen hier eintragen
]

def normalize(s):
    return s.lower().replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss")

for name in LABELS:
    h = hashlib.sha256(normalize(name).encode()).hexdigest()
    print(f'"{h}",  // {name}')
```

Die Ausgabe kommt ins `HASHES`-Array im HTML.

---

## Schritt 3 – HTML-Datei erstellen

Als Basis das Wintersport-Quiz verwenden:
`materialien/sport_wintersport-legenden_jg5-10_2026-06.html`

Folgende Stellen ersetzen:

### 3a – Titel und Eyebrow
```html
<title>NEUES THEMA – Quiz | Jan Herrmann</title>
```
```html
<div class="eyebrow">❄️ NEUES THEMA</div>
<h1>Erkennst du sie?</h1>
<p>Schreibe den Namen der gesuchten Person</p>
```

### 3b – IMAGES-Array
```js
const IMAGES = [
  "data:image/jpeg;base64,/9j/...",  // Person 1
  "data:image/jpeg;base64,/9j/...",  // Person 2
  // ... 12 Einträge
];
```

### 3c – HASHES-Array
```js
const HASHES = [
  "a3f5...",  // Franz Klammer
  "7c2b...",  // Claudia Pechstein
  // ... 12 SHA-256-Hashes
];
```

### 3d – LABELS-Array
```js
const LABELS = ["Name 1","Name 2", ...];
```

### 3e – INFOS-Array (Bio-Karten)
```js
const INFOS = [
  {
    flag: "🇩🇪",
    born: "3. Dezember 1953 in Musterstadt",
    sport: "Disziplin / Fach",
    highlights: [
      "Highlight 1",
      "Highlight 2",
      "Highlight 3"
    ]
  },
  // ... 12 Einträge
];
```

### 3f – Geheimlink-Bypass anpassen
Am Anfang des `<head>`, direkt nach `<meta charset="UTF-8">`:
```html
<script>
  if(!location.search.includes('k=NEUERKEY')){
    document.write('<scr'+'ipt src="/js/auth-guard.js"><\/scr'+'ipt>');
  }
</script>
```
`NEUERKEY` = 6–8 zufällige Buchstaben/Zahlen, z. B. `p5k2rn`.

---

## Schritt 4 – Dateiname festlegen

Schema: `fach_thema_jgSTUFE_JJJJ-MM.html`

Beispiele:
- `sport_sommersport-legenden_jg5-10_2026-06.html`
- `geschichte_us-praesidenten_jg9-10_2026-07.html`
- `musik_popstars-raten_jg5-10_2026-06.html`

Ablageort: `materialien/`

---

## Schritt 5 – Auf die Materialseite verlinken

In der passenden Materialseite (z. B. `materialien-sport.html` oder
`materialien-faecheruebergreifend.html`) im Abschnitt `Quizze` eine neue Karte eintragen:

```html
<a href="materialien/DATEINAME.html" class="mat-card">
    <span class="mat-badge quiz">🏅 Quiz</span>
    <div class="mat-title">TITEL DES QUIZ</div>
    <div class="mat-desc">KURZE BESCHREIBUNG. Alle Jahrgänge.</div>
</a>
```

---

## Schritt 6 – Geheimlink

Nach dem Deploy ist der Geheimlink (ohne Login-Pflicht):
```
https://lehrer-herrmann.de/materialien/DATEINAME.html?k=NEUERKEY
```

Der normale Link (Login erforderlich):
```
https://lehrer-herrmann.de/materialien/DATEINAME.html
```

---

## Schritt 7 – Committen und deployen

```bash
git add materialien/DATEINAME.html materialien-FACHSEITE.html
git -c user.email="jan@lehrer-herrmann.de" -c user.name="Jan Herrmann" \
    commit -m "Quiz THEMA: Bilderraten mit Geheimlink"
git push -u origin claude/BRANCHNAME
```

Dann Pull Request auf `main` erstellen und mergen.
Der GitHub-Webhook deployt automatisch auf den Server.

---

## Kolosseum-XP und Bestenliste (optional)

Wenn das Quiz Kolosseum-XP und eine globale Bestenliste haben soll,
am Ende des `<body>` einfügen (nach dem Quiz-`<script>`-Block):

```html
<script src="/js/supabase-config.js"></script>
<script src="/js/supabase-leaderboard.js"></script>
<script src="/js/kolosseum-prompt.js"></script>
```

Und in der `showResults()`-Funktion am Ende ergänzen:
```js
// Maximalscore = Anzahl Fragen × 100
const MAX = N * 100;
if(typeof window.kolosseumReport === 'function') {
  window.kolosseumReport(score, MAX, 'quiz-slug-hier');
}
if(typeof window.leaderboardSave === 'function') {
  window.leaderboardSave('quiz-slug-hier', score, MAX).then(() =>
    window.leaderboardFetch('quiz-slug-hier')
  ).then(entries => {
    document.getElementById('lb-output').innerHTML = window.leaderboardHTML(entries);
  }).catch(() => {});
}
```

Den Bestenlisten-Container im HTML-Ergebnis-Bereich einfügen
(vor dem „Nochmal spielen"-Button):
```html
<div id="lb-container" style="margin:24px 0; background:rgba(255,255,255,0.05);
     border-radius:16px; padding:20px;">
  <h3 style="font-family:'Bebas Neue',sans-serif; font-size:1.4rem;
       letter-spacing:2px; color:var(--gold); margin-bottom:12px;
       text-align:center;">🏆 Bestenliste</h3>
  <div id="lb-output" style="color:#94a3b8; text-align:center;
       font-size:0.9rem;">Wird geladen…</div>
</div>
```

Den `quiz-slug` konsistent halten (Kleinbuchstaben, Bindestriche), z. B. `sommersport-legenden`.

---

## Scoring-System

| Antwort | Punkte |
|---------|--------|
| Exakt richtig (SHA-256 stimmt) | +100 |
| Nah dran (Levenshtein-Distanz ≤ 3) | +50 |
| Falsch | 0 |
| **Maximum** (12 Fragen) | **1200** |

XP-Vergabe nach Notenpunkte-System: `XP = Notenpunkte × N`
(nur bei Verbesserung des Bestscores).

---

## Checkliste

- [ ] 12 Bilder als Base64 kodiert
- [ ] IMAGES-Array befüllt
- [ ] HASHES-Array mit Python-Snippet erzeugt
- [ ] LABELS-Array mit exakten Namen
- [ ] INFOS-Array mit Bio-Karten
- [ ] Titel/Eyebrow angepasst
- [ ] Geheimlink-Bypass-Key gesetzt (`k=XXXX`)
- [ ] Dateiname nach Schema
- [ ] Karte auf Materialseite eingetragen
- [ ] Kolosseum-XP-Integration (falls gewünscht)
- [ ] Commit + Push + PR + Merge
- [ ] Geheimlink getestet (ohne Login im Inkognito-Fenster)
- [ ] Normaler Link getestet (Login-Wall erscheint)
