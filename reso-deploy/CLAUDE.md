# Anweisung für Claude Code – RESO-System auf lehrer-herrmann.de aktualisieren

## Ausgangslage (wichtig zuerst lesen!)

Die Website **lehrer-herrmann.de** hat bereits ein RESO-System in einer älteren Version:
- `reso.html` — Portalseite, bereits live ✅
- `reso-selbsttest.html` — ältere Version, bereits live ✅
- `reso-lehrkraft.html` — ältere Version, bereits live ✅
- `reso-strategien.html` — bereits live ✅
- `reso-uebungen.html` — bereits live ✅

Die Dateien in diesem Ordner (`reso-deploy/`) sind aktualisierte bzw. neue Versionen.
**Es muss nichts gelöscht werden** – gleiche Dateinamen überschreiben automatisch, neue Dateien kommen hinzu.

Deployment läuft über: **GitHub → automatischer Webhook → Hetzner-Server**.

---

## Schritt 1 – Repo-Struktur verstehen

Schau dir kurz an, wo die HTML-Dateien der Website liegen (Stammverzeichnis oder Unterordner wie `public/`, `www/` etc.) und ob es eine GitHub Actions Workflow-Datei unter `.github/workflows/` gibt.

---

## Schritt 2 – HTML-Dateien platzieren

Kopiere alle HTML-Dateien aus `reso-deploy/` **in denselben Ordner, in dem `reso.html` und die anderen HTML-Seiten liegen**.

```
reso-selbsttest.html    → ersetzt alte Version (Multiple-Choice-Selbsttest, 35 Items)
reso-lehrkraft.html     → ersetzt alte Version (Lehrkraft-Dashboard)
reso-strategien.html    → ersetzt alte Version (Strategieerklärungen)
reso-uebungen.html      → ersetzt alte Version (Übungen)
reso-diktat.html        → NEU: Stufe 1 – Diagnosediktate mit Audio (5 Diktate, freie Eingabe)
reso-selbsttest2.html   → NEU: Stufe 2 – Erweiterter Selbsttest (98 Items, freie Eingabe)
```

**Inhalt der HTML-Dateien nicht verändern.** Die API-URL `https://lehrer-herrmann.de/reso-api` ist korrekt.

---

## Schritt 3 – reso.html um neue Links erweitern

Die bestehende `reso.html` hat bereits Karten für Selbsttest, Strategien, Übungen und Dashboard.
Füge zwei neue Karten hinzu – am besten direkt unter der bestehenden Selbsttest-Karte:

```html
<div>
  <h3>🎤 Diagnosediktate (Stufe 1)</h3>
  <p>5 Diktattexte mit Lücken – du hörst jedes Wort per Klick und schreibst es selbst.
     Keine Auswahlmöglichkeiten, echte Diagnostik.</p>
  <a href="https://lehrer-herrmann.de/reso-diktat.html">→ Zu den Diktaten</a>
</div>

<div>
  <h3>✍️ Erweiterter Selbsttest (Stufe 2)</h3>
  <p>98 Lückenwörter aus allen 7 Rechtschreibbereichen – du tippst die fehlenden
     Buchstaben selbst ein statt sie auszuwählen.</p>
  <a href="https://lehrer-herrmann.de/reso-selbsttest2.html">→ Zum erweiterten Test</a>
</div>
```

Passe Klassen und HTML-Struktur an den vorhandenen Stil von `reso.html` an.

---

## Schritt 4 – Backend-Dateien aktualisieren

Kopiere den Unterordner `reso-deploy/backend/` ins Repo als `reso-backend/` (ersetzt alte Version):

```
reso-backend/api.py              → v2.0: speichert jetzt Einzelitems pro Antwort
reso-backend/requirements.txt
reso-backend/reso-api.service
reso-backend/caddy-snippet.conf  → NEU: Caddy-Konfiguration (nicht nginx!)
reso-backend/nginx-snippet.conf  → alt, kann bleiben
reso-backend/setup.sh
```

---

## Schritt 5 – Commit & Push

**Commit-Message:**
```
RESO: Diagnosediktate (Stufe 1) und erweiterter Selbsttest (Stufe 2) hinzugefügt, Backend v2
```

---

## Was NICHT zu tun ist

- Inhalt der HTML-Dateien aus `reso-deploy/` nicht verändern
- `reso-deploy/` selbst **nicht** ins Repo committen – nur die Dateien daraus
- `reso-deploy/CLAUDE.md` (diese Datei) **nicht** committen
- Keine bestehenden Dateien löschen

---

## Was danach noch manuell per SSH erledigt werden muss

*(Einmalig – braucht Server-Zugriff. Der Server nutzt **Caddy**, nicht nginx.)*

```bash
# Backend-Upgrade auf v2 (neue Datenbankstruktur wird automatisch migriert)
cd /var/www/lehrer-homepage/reso-backend
source ../venv/bin/activate   # oder: /opt/reso/venv/bin/activate
pip install -r requirements.txt -q
systemctl stop reso-api && systemctl start reso-api

# Test
curl https://lehrer-herrmann.de/reso-api/
# Erwartete Antwort: {"status":"RESO API läuft","version":"2.0"}
```

---

## Ergebnis nach dem Deployment

| URL | Beschreibung |
|-----|-------------|
| `https://lehrer-herrmann.de/reso.html` | Portal (aktualisiert) |
| `https://lehrer-herrmann.de/reso-selbsttest.html` | Selbsttest (aktualisiert) |
| `https://lehrer-herrmann.de/reso-diktat.html` | Diagnosediktate – NEU |
| `https://lehrer-herrmann.de/reso-selbsttest2.html` | Erweiterter Selbsttest – NEU |
| `https://lehrer-herrmann.de/reso-strategien.html` | Strategien (aktualisiert) |
| `https://lehrer-herrmann.de/reso-uebungen.html` | Übungen (aktualisiert) |
| `https://lehrer-herrmann.de/reso-lehrkraft.html` | Dashboard (aktualisiert) |
| `https://lehrer-herrmann.de/reso-api/` | Backend v2 |
