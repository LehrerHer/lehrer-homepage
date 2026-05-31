# Anweisung für Claude Code – RESO-System auf lehrer-herrmann.de einrichten

## Kontext

Du arbeitest im GitHub-Repository der Website **lehrer-herrmann.de** (Hetzner-Server, automatisches Deployment per GitHub → Webhook). Der Ordner `reso-deploy/` enthält fertige Dateien für das RESO-Rechtschreibdiagnostiksystem. Deine Aufgabe: diese Dateien korrekt ins Repo integrieren und einen Commit pushen.

---

## Schritt 1 – Repo-Struktur verstehen

Schau dir zuerst die vorhandene Verzeichnisstruktur an:
- Wo liegen die HTML-Seiten der Homepage? (Suche nach `*.html`-Dateien im Repo-Stammverzeichnis oder in einem Ordner wie `public/`, `www/`, `src/` o. ä.)
- Gibt es eine GitHub Actions Workflow-Datei unter `.github/workflows/`? Lies sie kurz, um den Deploy-Pfad auf dem Server zu verstehen.

---

## Schritt 2 – HTML-Dateien platzieren

Kopiere diese vier Dateien aus `reso-deploy/` **in denselben Ordner, in dem die anderen HTML-Seiten der Homepage liegen**:

```
reso-selbsttest.html    → Schüler-Selbsttest (35 Aufgaben, 5 Varianten)
reso-lehrkraft.html     → Lehrkraft-Dashboard (Ergebnisse, Heatmap)
reso-strategien.html    → Interaktive Strategieerklärungen für Schüler
reso-uebungen.html      → Interaktive Übungen für Schüler
```

**Verändere den Inhalt dieser Dateien nicht.** Die API-URL `https://lehrer-herrmann.de/reso-api` ist bereits korrekt eingetragen.

---

## Schritt 3 – Backend-Dateien platzieren

Kopiere den gesamten Unterordner `reso-deploy/backend/` ins Repo-Stammverzeichnis und benenne ihn in `reso-backend/` um:

```
reso-backend/
  api.py               → FastAPI-Anwendung (Python)
  requirements.txt     → Python-Abhängigkeiten
  reso-api.service     → systemd-Service-Datei
  nginx-snippet.conf   → nginx-Konfigurationsausschnitt
  setup.sh             → Einrichtungsskript für den Server
```

---

## Schritt 4 – GitHub Actions prüfen (falls vorhanden)

Falls es eine Workflow-Datei unter `.github/workflows/` gibt:

Prüfe, ob der Workflow nur HTML/CSS/JS deployed oder auch beliebige Verzeichnisse überträgt. Falls er nur bestimmte Dateitypen/Ordner überträgt, erweitere ihn so, dass `reso-backend/` ebenfalls auf den Server übertragen wird (z. B. per `rsync` oder `scp`). Zielverzeichnis auf dem Server laut nginx-Konfiguration: der Pfad, unter dem die Website ausgeliefert wird (typisch `/var/www/html/` oder ähnliches).

Falls kein Workflow vorhanden oder du dir nicht sicher bist: Lass die Workflow-Datei unverändert und notiere am Ende deiner Antwort, was manuell zu tun ist.

---

## Schritt 5 – Commit und Push

Committe alle neuen/geänderten Dateien und pushe zu GitHub.

**Commit-Message:**
```
RESO-Diagnostiksystem hinzugefügt (Selbsttest, Strategien, Übungen, Lehrkraft-Dashboard, Backend)
```

---

## Was NICHT zu tun ist

- Den **Inhalt** der vier HTML-Dateien nicht verändern (keine URLs, keine Texte, keine Skripte anpassen)
- Die `reso-deploy/`-Mappe selbst **nicht** ins Repo committen – nur die Dateien daraus
- Keine Packages installieren, keine Datenbanken anlegen – das ist Sache des Server-Setups
- `reso-deploy/CLAUDE.md` (diese Datei) **nicht** committen

---

## Was danach noch manuell per SSH erledigt werden muss

*(Nicht durch Claude Code – das erfordert Server-Zugriff)*

Nach dem ersten erfolgreichen Deploy:

```bash
# 1. Ins Backend-Verzeichnis wechseln (Deploy-Pfad aus dem Workflow)
cd /var/www/html/reso-backend   # Pfad ggf. anpassen

# 2. Einrichtungsskript ausführen (richtet venv, systemd-Service ein, fragt nach Token)
bash setup.sh

# 3. nginx-Konfiguration erweitern
# Inhalt von nginx-snippet.conf in den server{}-Block von lehrer-herrmann.de einfügen
nano /etc/nginx/sites-available/lehrer-herrmann.de
nginx -t && systemctl reload nginx

# 4. Testen
curl https://lehrer-herrmann.de/reso-api/
# Erwartete Antwort: {"status":"RESO API läuft"}
```

---

## Zusammenfassung der URLs nach dem Deployment

| URL | Beschreibung |
|-----|-------------|
| `https://lehrer-herrmann.de/reso-selbsttest.html` | Schüler-Selbsttest |
| `https://lehrer-herrmann.de/reso-strategien.html` | Strategieerklärungen |
| `https://lehrer-herrmann.de/reso-uebungen.html` | Übungen |
| `https://lehrer-herrmann.de/reso-lehrkraft.html` | Lehrkraft-Dashboard |
| `https://lehrer-herrmann.de/reso-api/` | API (Backend) |
