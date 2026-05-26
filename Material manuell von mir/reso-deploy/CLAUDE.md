# Aufgabe für Claude Code

In diesem Ordner (`reso-deploy/`) liegen fertige Dateien für das RESO-Rechtschreibdiagnostik-System. Baue sie wie folgt in die Homepage ein:

## 1. HTML-Dateien ins Website-Verzeichnis kopieren

Kopiere diese beiden Dateien in das Hauptverzeichnis der Website (dort, wo die anderen HTML-Seiten liegen):
- `reso-selbsttest.html`
- `reso-lehrkraft.html`

Verändere den Inhalt der HTML-Dateien **nicht**. Die API-URL `https://lehrer-herrmann.de/reso-api` darin ist bereits korrekt.

## 2. Backend-Dateien ins Repo kopieren

Kopiere den Ordner `backend/` mit allen Dateien ins Repo-Stammverzeichnis, sodass er dort als `reso-backend/` liegt:
- `reso-backend/api.py`
- `reso-backend/requirements.txt`
- `reso-backend/reso-api.service`
- `reso-backend/nginx-snippet.conf`
- `reso-backend/setup.sh`

## 3. Commit & Push

Committe alles und pushe zu GitHub. Commit-Message:
```
RESO Diagnostik: Selbsttest, Lehrkraft-Dashboard und Backend hinzugefügt
```

## 4. Hinweis für die Server-Einrichtung (einmalig per SSH – nicht durch Claude Code)

Das Backend muss einmalig manuell auf dem Hetzner-Server eingerichtet werden:
```bash
cd /var/www/html/reso-backend   # oder entsprechender Deploy-Pfad
bash setup.sh
```
Danach den Inhalt von `nginx-snippet.conf` in die nginx-Konfiguration für lehrer-herrmann.de einfügen und nginx neu laden:
```bash
nginx -t && systemctl reload nginx
```
