# Anweisung für Claude Code – Quatschwort-Audio einrichten

## Ausgangslage

Im Repo-Ordner `audio/quatsch/` liegen 16 Aufnahmen für Diktat 1 und 2.
Die Dateien haben eine doppelte Endung (`.mp3.m4a`) — sie sind im m4a-Format,
müssen aber als `.mp3` auf dem Server vorliegen, damit der Browser sie abspielt.

Deployment läuft über: **GitHub → automatischer Webhook → Hetzner-Server**.
Der Server nutzt **Caddy** (nicht nginx).

---

## Schritt 1 – Audio-Dateien ins Repo aufnehmen

Der Ordner `audio/quatsch/` liegt bereits im Repo-Stammverzeichnis.
Stelle sicher, dass Git ihn trackt (`.gitignore` darf `audio/` nicht ausschließen).

Falls nötig: `git add audio/ && git status` prüfen.

---

## Schritt 2 – Commit & Push

Committe den `audio/`-Ordner und pushe zu GitHub:

```
git add audio/
git commit -m "Quatschwort-Audio: Diktate 1 und 2 hinzugefügt"
git push
```

---

## Schritt 3 – Konvertierung auf dem Server (per SSH)

Nach dem Deploy per SSH auf den Server:

```bash
ssh root@lehrer-herrmann.de
```

Prüfen ob ffmpeg vorhanden ist:
```bash
ffmpeg -version
```

Falls nicht installiert:
```bash
apt install ffmpeg -y
```

Dann in den Audio-Ordner wechseln (Deploy-Pfad aus dem Workflow entnehmen,
typisch `/var/www/lehrer-homepage/audio/quatsch/`):

```bash
cd /var/www/lehrer-homepage/audio/quatsch/

# Alle .mp3.m4a-Dateien in echte .mp3-Dateien konvertieren
for f in *.mp3.m4a; do
  base="${f%.mp3.m4a}"
  ffmpeg -i "$f" -codec:a libmp3lame -qscale:a 4 "${base}.mp3" -y
  echo "Konvertiert: $f → ${base}.mp3"
done

# Prüfen ob alle 16 .mp3-Dateien da sind
ls *.mp3 | wc -l
# Erwartete Ausgabe: 16
```

---

## Schritt 4 – reso-quatsch.html aktualisieren

Öffne `reso-quatsch.html` im Repo und ändere die Konstante `AUDIO_BASE`,
falls der Audio-Pfad auf dem Server nicht `/audio/quatsch/` ist, sondern
einen anderen Pfad hat. Den tatsächlichen Pfad aus dem Workflow entnehmen.

Der Wert steht in der Zeile:
```js
const AUDIO_BASE = "/audio/quatsch/";
```

Passe ihn an falls nötig, committe und pushe.

---

## Schritt 5 – Test im Browser

```
https://lehrer-herrmann.de/audio/quatsch/q1-s1.mp3
```

Diese URL direkt im Browser aufrufen — sie muss die Audiodatei abspielen.
Falls 404: Pfad im Workflow prüfen und ggf. AUDIO_BASE anpassen.

---

## Fertige Dateistruktur auf dem Server

```
/var/www/lehrer-homepage/audio/quatsch/
  q1-full.mp3
  q1-s1.mp3  …  q1-s7.mp3
  q2-full.mp3
  q2-s1.mp3  …  q2-s7.mp3
```

Wenn Diktate 3 und 4 aufgenommen sind: gleicher Prozess, selber Ordner.
