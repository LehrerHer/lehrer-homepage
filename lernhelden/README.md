# Lernhelden 🦸

Gamifiziertes Belohnungssystem für Schülerinnen und Schüler – einbettbar in eine Lehrerhomepage.

## Architektur-Entscheidung

**Option A (Node.js + SQLite)** wurde gewählt, weil:
- Keine Cloudabhängigkeit (DSGVO-freundlich, alles lokal)
- Eine einzige SQLite-Datei = einfaches Backup (einfach kopieren)
- Kein externer Account nötig
- Läuft auf jedem Rechner/Raspberry Pi mit Node.js

## Setup

### 1. Voraussetzungen
- Node.js ≥ 18.x

### 2. Installation

```bash
cd lernhelden
npm install
```

### 3. Umgebungsvariablen

```bash
cp .env.example .env
```

`.env` anpassen:

```env
PORT=3000
SESSION_SECRET=mindestens-32-zufaellige-zeichen-hier
ADMIN_PASSWORD_HASH=hier_bcrypt_hash_eintragen
DB_PATH=./db/lernhelden.db
```

**Admin-Passwort-Hash generieren:**
```bash
node -e "require('bcryptjs').hash('DeinPasswort',10).then(h=>console.log(h))"
```
Den ausgegebenen Hash in `ADMIN_PASSWORD_HASH` eintragen.

> Ohne `ADMIN_PASSWORD_HASH` wird automatisch `lernhelden` als Passwort verwendet (nur für Tests!).

### 4. Starten

```bash
npm start
# oder im Entwicklungsmodus mit Auto-Reload:
npm run dev
```

App läuft auf: **http://localhost:3000**

---

## Seiten

| URL | Beschreibung |
|-----|-------------|
| `/` | Redirect → Login oder Profil |
| `/login` | SuS-Login (Spitzname + PIN) |
| `/profil` | Profil mit Avatar, XP, Badges |
| `/quiz` | Alle verfügbaren Quizzes |
| `/quiz/:id` | Quiz spielen |
| `/rangliste` | Öffentliche Rangliste (kein Login nötig) |
| `/admin` | Admin-Login |
| `/admin/dashboard` | Übersicht & Aktivitäten |
| `/admin/schueler` | Schüler anlegen, XP anpassen, Badges vergeben |
| `/admin/quiz` | Quizzes erstellen & löschen |
| `/admin/export` | CSV-Export aller Schülerdaten |

---

## SuS-Workflow

1. Lehrer legt SuS über Admin-Panel an (Spitzname + PIN)
2. SuS loggt sich ein unter `/login`
3. Quizzes absolvieren → XP sammeln → Level aufsteigen
4. Badges werden automatisch freigeschaltet
5. Rangliste unter `/rangliste` einsehbar

---

## Einbettung per iframe (Lehrerhomepage)

In `index.html` der Lehrerhomepage einfügen:

```html
<iframe
  src="http://localhost:3000"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius:16px"
  title="Lernhelden"
></iframe>
```

---

## Level-System

| Level | Name | XP | Farbe |
|-------|------|----|-------|
| 1 | Lehrling | 0 | Grau |
| 2 | Entdecker | 100 | Grün |
| 3 | Kämpfer | 250 | Blau + Schwert |
| 4 | Held | 500 | Lila + Schwert + Schild + Glow |
| 5 | Ritter | 900 | Orange + Cape + alles |
| 6 | Champion | 1400 | Rot + Krone + alles |
| 7 | Legende | 2000 | Gold + alles + Glitzer |

---

## Badges

| Badge | Bedingung |
|-------|-----------|
| 🌟 Erster Tag | Erstanmeldung |
| 💯 100 XP | XP ≥ 100 |
| 🔥 250 XP | XP ≥ 250 |
| ⚡ 500 XP | XP ≥ 500 |
| 👑 1000 XP | XP ≥ 1000 |
| 🎯 Perfektes Quiz | 100% in einem Quiz |
| 🔁 Dreitagesstreak | 3 Tage in Folge aktiv |
| 🏆 Legende | XP ≥ 2000 |

---

## Demo-Quizzes

Beim ersten Start werden automatisch 3 Quizzes angelegt:
1. **Mathematik: Grundrechenarten** (5 Fragen)
2. **Deutsch: Grammatik** (5 Fragen)
3. **Englisch: Basics** (5 Fragen)

---

## Sicherheit

- PINs werden mit bcrypt (cost 10) gehasht
- Admin-Passwort in `.env` (bcrypt-Hash)
- Sessions: `httpOnly`-Cookie, `secure` in Produktion
- Rate-Limiting: 10 Login-Versuche / 15 Min (SuS), 5 (Admin)
- Prepared Statements gegen SQL-Injection
- `.env` und `lernhelden.db` sind in `.gitignore`

---

## Backup

```bash
# Datenbank sichern
cp db/lernhelden.db db/lernhelden-backup-$(date +%Y%m%d).db
```
