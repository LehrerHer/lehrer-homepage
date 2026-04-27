# Lernkolosseum

Gamifiziertes Belohnungssystem für Schülerinnen und Schüler.  
Node.js · Express · SQLite · Vanilla JS

---

## Voraussetzungen

- Node.js ≥ 18
- npm

---

## Ersteinrichtung

```bash
cd kolosseum
npm install
cp .env.example .env
```

### .env befüllen

```env
PORT=3000
SESSION_SECRET=<langer-zufälliger-string>
ADMIN_PASSWORD_HASH=<bcrypt-hash-des-admin-passworts>
DB_PATH=./db/kolosseum.db
```

**Admin-Passwort-Hash erzeugen:**

```bash
node -e "const b=require('bcryptjs');b.hash('DEIN_PASSWORT',10).then(h=>console.log(h))"
```

Den ausgegebenen Hash in `ADMIN_PASSWORD_HASH` eintragen.

---

## App starten

```bash
node server.js
# oder mit PM2:
pm2 start server.js --name kolosseum
```

App läuft dann unter `http://localhost:3000`.

---

## Demo-Daten anlegen

Drei Quizze (Deutsch, Mathematik, Allgemeinwissen) mit je 5 Fragen:

```bash
node db/seed.js
```

Das Script kann gefahrlos mehrfach ausgeführt werden – bereits vorhandene Quizze werden übersprungen.

---

## Routen-Übersicht

### Schüler-Bereich

| Seite | URL |
|-------|-----|
| Login | `/login.html` |
| Heldenprofil | `/profil.html` |
| Rangliste | `/rangliste.html` |
| Quiz-Übersicht | `/quiz.html` |
| Quiz spielen | `/quiz-spiel.html?id=<id>` |

### Admin-Bereich

| Seite | URL |
|-------|-----|
| Admin-Login | `/admin/index.html` |
| Dashboard | `/admin/dashboard.html` |
| Schülerverwaltung | `/admin/schueler.html` |
| Quiz-Verwaltung | `/admin/quiz.html` |
| CSV-Export | `/api/admin/export` |

---

## API-Endpunkte

### Auth
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | `/api/auth/login` | Schüler-Login (nick + pin) |
| POST | `/api/auth/logout` | Ausloggen |
| GET | `/api/auth/me` | Eigene Session-Daten |
| POST | `/api/auth/admin/login` | Admin-Login |
| POST | `/api/auth/admin/logout` | Admin ausloggen |
| GET | `/api/auth/admin/check` | Admin-Session prüfen |

### Schüler (🔒 = eingeloggt)
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET 🔒 | `/api/students/profile` | Profil + Badges + XP-Log |
| GET 🔒 | `/api/students/rangliste` | Top 50 nach XP |

### Quizze
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/quizzes` | Alle Quizze (inkl. eigene Ergebnisse wenn eingeloggt) |
| GET | `/api/quizzes/:id` | Quiz mit Fragen (ohne korrekte Antworten) |
| POST 🔒 | `/api/quizzes/:id/submit` | Antworten einreichen, XP erhalten |

### Admin (🛡 = Admin-Session)
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET 🛡 | `/api/admin/stats` | Dashboard-Statistiken |
| GET 🛡 | `/api/admin/students` | Alle Schüler |
| POST 🛡 | `/api/admin/students` | Schüler anlegen |
| PATCH 🛡 | `/api/admin/students/:id/xp` | XP anpassen |
| DELETE 🛡 | `/api/admin/students/:id` | Schüler löschen |
| GET 🛡 | `/api/admin/export` | CSV-Download |
| GET 🛡 | `/api/admin/quizzes` | Alle Quizze (Admin-Ansicht) |
| GET 🛡 | `/api/admin/quizzes/:id` | Quiz mit Fragen + richtigen Antworten |
| POST 🛡 | `/api/admin/quizzes` | Quiz anlegen |
| POST 🛡 | `/api/admin/quizzes/:id/questions` | Frage hinzufügen |
| DELETE 🛡 | `/api/admin/quizzes/:id` | Quiz löschen |
| DELETE 🛡 | `/api/admin/questions/:id` | Frage löschen |

---

## XP-System

| Level | Name | XP ab |
|-------|------|-------|
| 1 | Lehrling | 0 |
| 2 | Entdecker | 100 |
| 3 | Kämpfer | 250 |
| 4 | Held | 500 |
| 5 | Ritter | 1 000 |
| 6 | Champion | 1 750 |
| 7 | Legende | 3 000 |

Quizze vergeben standardmäßig **15 XP pro richtiger Antwort**.  
Bei Wiederholungen werden nur **25 % der XP** gutgeschrieben.

---

## Badge-System

| Badge | Bedingung |
|-------|-----------|
| 🌟 Erster Tag | Erstanmeldung |
| 💯 100 XP | 100 XP erreicht |
| 🔥 250 XP | 250 XP erreicht |
| ⚡ 500 XP | 500 XP erreicht |
| 👑 1000 XP | 1 000 XP erreicht |
| 🏆 Legende | 2 000 XP erreicht |
| 🎯 Perfektes Quiz | Quiz mit 100 % abgeschlossen |
| 🔁 Dreitagesstreak | 3 Tage in Folge aktiv *(manuell vergeben)* |

---

## Deploy auf dem Hetzner-Server

```bash
cd /var/www/lehrer-homepage
git pull
pm2 restart kolosseum
```

Bei neuen npm-Paketen zusätzlich:
```bash
cd kolosseum && npm install
```

Caddy übernimmt SSL und leitet `kolosseum.lehrer-herrmann.de` auf Port 3000 weiter.

---

## Projektstruktur

```
kolosseum/
├── server.js              # Einstiegspunkt
├── .env.example           # Konfigurationsvorlage
├── db/
│   ├── database.js        # SQLite-Verbindung + Session-Store
│   ├── schema.sql         # Datenbankschema
│   ├── badges.js          # Badge-Definitionen + Auto-Vergabe
│   └── seed.js            # Demo-Quizze anlegen
├── middleware/
│   ├── auth.js            # requireStudent / requireAdmin
│   └── rateLimit.js       # Login-Rate-Limiter
├── routes/
│   ├── auth.js            # Login / Logout
│   ├── students.js        # Profil / Rangliste
│   ├── admin.js           # Admin-API
│   └── quiz.js            # Quiz-API
└── public/
    ├── css/style.css
    ├── js/avatar.js
    ├── login.html
    ├── profil.html
    ├── rangliste.html
    ├── quiz.html
    ├── quiz-spiel.html
    └── admin/
        ├── index.html
        ├── dashboard.html
        ├── schueler.html
        └── quiz.html
```
