# Anweisung für Claude Code – RESO-System aktualisieren (großes Update)

## Ausgangslage

Die Website lehrer-herrmann.de hat bereits ein laufendes RESO-System.
Dieser Ordner (`reso-deploy/`) enthält ein vollständiges Update mit neuen Seiten,
Audio-Dateien und einer aktualisierten Backend-Version.

Deployment: **GitHub → automatischer Webhook → Hetzner-Server** (Caddy, nicht nginx).

---

## Schritt 1 – Repo-Struktur verstehen

Schau kurz nach:
- Wo liegen die HTML-Seiten? (Stammverzeichnis oder `public/` o. ä.)
- Gibt es `.github/workflows/` mit einem Deploy-Workflow?
- Merke dir den **Server-Deploy-Pfad** aus dem Workflow (z. B. `/var/www/lehrer-homepage`).

---

## Schritt 2 – HTML-Dateien platzieren

Kopiere **alle** HTML-Dateien aus `reso-deploy/` in denselben Ordner,
in dem die anderen HTML-Seiten der Homepage liegen.
Gleiche Dateinamen überschreiben alte Versionen automatisch.

```
reso-selbsttest.html        → ersetzt (Multiple-Choice-Selbsttest)
reso-lehrkraft.html         → ersetzt (Dashboard + neue Detailansicht)
reso-strategien.html        → ersetzt
reso-uebungen.html          → ersetzt
reso-diktat.html            → NEU: Stufe 1 – Diagnosediktate mit Audio
reso-selbsttest2.html       → NEU: Stufe 2 – 98 Items, freie Eingabe
reso-strategieabfrage.html  → NEU: Stufe 3 – Strategie benennen
reso-quatsch.html           → NEU: Stufe 4 – Quatschwortdiktat
```

Inhalt der HTML-Dateien **nicht verändern**.

---

## Schritt 3 – Audio-Ordner ins Repo

Kopiere den kompletten Unterordner `reso-deploy/audio/` ins Repo-Stammverzeichnis:

```
audio/
  quatsch/
    q1-full.mp3   q1-full.m4a
    q1-s1.mp3     q1-s1.m4a
    q1-s2.mp3     q1-s2.m4a
    … (alle q1 und q2 Dateien)
    q2-full.mp3   q2-full.m4a
    q2-s1.mp3     q2-s1.m4a
    … usw.
```

Wichtig: Sowohl `.mp3` als auch `.m4a` mitnehmen – verschiedene Browser
bevorzugen verschiedene Formate.

---

## Schritt 4 – reso.html um neue Seiten erweitern

Die bestehende `reso.html` zeigt Karten für Selbsttest, Dashboard usw.
Füge vier neue Karten hinzu, passend zum vorhandenen Stil:

```html
<!-- Stufe 1: Diagnosediktate -->
<div>
  <h3>🎤 Diagnosediktate (Stufe 1)</h3>
  <p>5 Diktattexte – du hörst jedes Wort per Klick und schreibst es selbst. Keine Auswahlmöglichkeiten.</p>
  <a href="https://lehrer-herrmann.de/reso-diktat.html">→ Zu den Diktaten</a>
</div>

<!-- Stufe 2: Erweiterter Selbsttest -->
<div>
  <h3>✍️ Erweiterter Selbsttest (Stufe 2)</h3>
  <p>98 Lückenwörter – fehlende Buchstaben selbst eintippen statt auswählen.</p>
  <a href="https://lehrer-herrmann.de/reso-selbsttest2.html">→ Zum erweiterten Test</a>
</div>

<!-- Stufe 3: Strategieabfrage -->
<div>
  <h3>🧠 Strategieabfrage (Stufe 3)</h3>
  <p>Richtige Schreibung wählen und erklären, welche Strategie du genutzt hast.</p>
  <a href="https://lehrer-herrmann.de/reso-strategieabfrage.html">→ Zur Strategieabfrage</a>
</div>

<!-- Stufe 4: Quatschwortdiktat -->
<div>
  <h3>🔊 Quatschwortdiktat (Stufe 4)</h3>
  <p>Erfundene Wörter hören und aufschreiben – Rechtschreibregeln gelten auch für Quatschwörter!</p>
  <a href="https://lehrer-herrmann.de/reso-quatsch.html">→ Zum Quatschwortdiktat</a>
</div>
```

Klassen und HTML-Struktur an den vorhandenen Stil von `reso.html` anpassen.

---

## Schritt 5 – Backend aktualisieren

Kopiere `reso-deploy/backend/api.py` ins Repo als `reso-backend/api.py`
(ersetzt die alte Version – das ist Backend v2.0 mit granularer Fehlerstruktur).

---

## Schritt 6 – Commit & Push

```
RESO: Stufe 2–4, Audio-Quatschwortdiktat, Dashboard-Detailansicht
```

---

## Schritt 7 – Server: Backend neu starten (SSH)

Nach dem Deploy muss das Backend neu gestartet werden, damit v2.0 aktiv wird:

```bash
ssh root@lehrer-herrmann.de
systemctl stop reso-api && systemctl start reso-api
curl https://lehrer-herrmann.de/reso-api/
# Erwartete Antwort: {"status":"RESO API läuft","version":"2.0"}
```

---

## Was NICHT zu tun ist

- Inhalt der HTML-Dateien nicht verändern
- `reso-deploy/` selbst nicht committen – nur Dateien daraus
- `reso-deploy/CLAUDE.md` und `reso-deploy/CLAUDE-AUDIO.md` nicht committen
- Keine bestehenden Dateien löschen

---

## Ergebnis nach dem Deployment

| URL | Status |
|-----|--------|
| `…/reso.html` | Aktualisiert (+4 neue Karten) |
| `…/reso-diktat.html` | NEU |
| `…/reso-selbsttest2.html` | NEU |
| `…/reso-strategieabfrage.html` | NEU |
| `…/reso-quatsch.html` | NEU (Audio für Diktat 1+2 aktiv) |
| `…/audio/quatsch/q1-s1.mp3` | NEU (Audio-Dateien) |
| `…/reso-lehrkraft.html` | Aktualisiert (Detailansicht) |
| `…/reso-api/` | Backend v2.0 |
