# Anweisung für Claude Code – RESO-System auf lehrer-herrmann.de aktualisieren

## Ausgangslage (wichtig zuerst lesen!)

Die Website **lehrer-herrmann.de** hat bereits ein RESO-System in einer älteren Version:
- `reso.html` — Portalseite, bereits live ✅
- `reso-selbsttest.html` — ältere Version, bereits live ✅
- `reso-lehrkraft.html` — ältere Version, bereits live ✅

Die Dateien in diesem Ordner (`reso-deploy/`) sind aktualisierte bzw. neue Versionen.
**Es muss nichts gelöscht werden** – gleiche Dateinamen überschreiben automatisch, neue Dateien kommen hinzu.

Deployment läuft über: **GitHub → automatischer Webhook → Hetzner-Server**.

---

## Schritt 1 – Repo-Struktur verstehen

Schau dir kurz an, wo die HTML-Dateien der Website liegen (Stammverzeichnis oder Unterordner wie `public/`, `www/` etc.) und ob es eine GitHub Actions Workflow-Datei unter `.github/workflows/` gibt.

---

## Schritt 2 – HTML-Dateien platzieren

Kopiere diese vier Dateien aus `reso-deploy/` **in denselben Ordner, in dem `reso.html` und die anderen HTML-Seiten liegen**.

`reso-selbsttest.html` und `reso-lehrkraft.html` ersetzen die alten Versionen.
`reso-strategien.html` und `reso-uebungen.html` sind neu.

```
reso-selbsttest.html   → ersetzt alte Version (Selbsttest mit 35 Aufgaben, 5 Varianten)
reso-lehrkraft.html    → ersetzt alte Version (Lehrkraft-Dashboard)
reso-strategien.html   → NEU: Interaktive Strategieerklärungen für Schüler
reso-uebungen.html     → NEU: Interaktive Übungen für Schüler
```

**Inhalt der HTML-Dateien nicht verändern.** Die API-URL `https://lehrer-herrmann.de/reso-api` ist korrekt.

---

## Schritt 3 – reso.html um zwei Links erweitern

Die bestehende `reso.html` verlinkt bereits auf Selbsttest und Dashboard, aber noch nicht auf die neuen Seiten. Füge im Bereich „Wo möchtest du starten?" zwei weitere Karten ein – direkt nach der Karte für den Selbsttest.

Füge diesen HTML-Block an passender Stelle in `reso.html` ein (nach dem Selbsttest-Block, vor oder nach dem Lehrkraft-Block):

```html
<div>
  <h3>📖 Strategien lernen</h3>
  <p>Verstehe die Regeln hinter den 7 Rechtschreibbereichen – mit Erklärungen, Beispielen und der Strategie zum Selbst-Nachdenken.</p>
  <a href="https://lehrer-herrmann.de/reso-strategien.html">→ Zu den Strategien</a>
</div>

<div>
  <h3>✏️ Üben</h3>
  <p>Lückentext und Fehlersuche – gezielte Übungen für jeden der 7 Rechtschreibbereiche, mit sofortigem Feedback.</p>
  <a href="https://lehrer-herrmann.de/reso-uebungen.html">→ Zu den Übungen</a>
</div>
```

Passe dabei Klassen und HTML-Struktur an den vorhandenen Stil von `reso.html` an, damit die neuen Karten genauso aussehen wie die bestehenden.

---

## Schritt 4 – Backend-Dateien ins Repo

Kopiere den Unterordner `reso-deploy/backend/` ins Repo und lege ihn als `reso-backend/` im Stammverzeichnis ab:

```
reso-backend/api.py
reso-backend/requirements.txt
reso-backend/reso-api.service
reso-backend/nginx-snippet.conf
reso-backend/setup.sh
```

---

## Schritt 5 – Commit & Push

Committe alle geänderten/neuen Dateien und pushe zu GitHub.

**Commit-Message:**
```
RESO: Strategien und Übungen hinzugefügt, Selbsttest und Dashboard aktualisiert
```

---

## Was NICHT zu tun ist

- Den **Inhalt** der vier HTML-Dateien aus `reso-deploy/` nicht verändern
- `reso-deploy/` selbst **nicht** ins Repo committen – nur die Dateien daraus
- `reso-deploy/CLAUDE.md` (diese Datei) **nicht** committen
- Keine bestehenden Dateien löschen – alles wird ersetzt oder ergänzt

---

## Was danach noch manuell per SSH erledigt werden muss

*(Nur einmalig – braucht Server-Zugriff, nicht durch Claude Code)*

```bash
# 1. Ins Backend-Verzeichnis wechseln (Deploy-Pfad aus dem Workflow)
cd /pfad/zum/reso-backend   # Pfad aus Workflow-Datei entnehmen

# 2. Einrichtung (richtet venv, systemd-Service ein, fragt nach Token)
bash setup.sh

# 3. nginx-Konfiguration erweitern
# Inhalt von nginx-snippet.conf in den server{}-Block von lehrer-herrmann.de einfügen
nginx -t && systemctl reload nginx

# 4. Test
curl https://lehrer-herrmann.de/reso-api/
# Erwartete Antwort: {"status":"RESO API läuft"}
```

---

## Ergebnis nach dem Deployment

| URL | Status |
|-----|--------|
| `https://lehrer-herrmann.de/reso.html` | Aktualisiert (+ 2 neue Links) |
| `https://lehrer-herrmann.de/reso-selbsttest.html` | Aktualisiert |
| `https://lehrer-herrmann.de/reso-lehrkraft.html` | Aktualisiert |
| `https://lehrer-herrmann.de/reso-strategien.html` | Neu |
| `https://lehrer-herrmann.de/reso-uebungen.html` | Neu |
| `https://lehrer-herrmann.de/reso-api/` | Nach SSH-Setup |
