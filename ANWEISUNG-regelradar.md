# Auftrag für einen neuen Chat: RegelRadar vereinfachen und umgestalten

Lies zuerst `CLAUDE.md` im Repo (Pflichtregeln für Git, Layout, Navbar/Footer, Abschnitt „RegelRadar").
Arbeite auf einem eigenen Feature-Branch `claude/regelradar-<id>` und erstelle am Ende selbst einen Pull Request.
Vor dem Mergen frag Jan („Soll ich das jetzt mergen?"). Nichts direkt auf `main`.

**Empfehlung:** Mittelgroßes Paket mit Backend und Frontend. Ein starkes Modell (Opus) lohnt sich für den Teil „Login/Datenmodell" (Schritt 2).

## Ausgangslage

RegelRadar (Rechtschreibung & Zeichensetzung) ist ein eigenes System:

- Frontend im Root: `regelradar.html` (Hub), `regelradar-selbsttest.html` (Schüler-Selbsttest), `regelradar-lehrkraft.html` (Dashboard), `regelradar-diktat.html`, `-strategien`, `-strategieabfrage`, `-uebungen`, `-selbsttest2`, `-quatsch`. Die `reso*.html` sind nur Redirect-Stubs.
- Backend: `reso-backend/api.py` (FastAPI + SQLite, Service `reso-api`, Pfad `/reso-api` bleibt, das ist ein Server-Vertrag). Tabellen `klassen` und `ergebnisse` (Klassencode, Schülername, Variante, Kategorien, Items).
- Schüler geben bisher **Klassencode + Name** ein und senden Ergebnisse anonym an `POST /reso-api/ergebnis`. Die Lehrkraft meldet sich im Dashboard mit einem **Lehrkraft-Token** (Bearer) an.
- Die Homepage hat ein eigenes Login: Kolosseum-Accounts (`GET https://kolosseum.lehrer-herrmann.de/api/auth/me`, Session-Cookie, siehe `js/homepage-gate.js`). Admin-Zugang im Kolosseum: `kolosseum/routes/auth.js`, `requireAdmin`.

## Ziel (Jans Wunsch)

Aktuell muss Jan sich über ein Dashboard einloggen und einen Token einfügen. Das ist zu kompliziert.

1. **Schüler*innen**, die auf der Homepage eingeloggt sind, machen die Diagnostik **direkt mit diesem Login**, ohne zweiten Login, ohne Klassencode.
2. **Jan** sieht anhand der Homepage-Login-Daten, wie die Diagnostik bei jedem Kind verlaufen ist, **ohne Token**. Zugang über den vorhandenen Admin-Login im Kolosseum.
3. **Zwischenschritt beim Start der Diagnostik:** Das Kind tippt seinen **echten Namen** ein. Dieser ist nur für Jan sichtbar (nicht in Ranglisten, nicht in öffentlichen Ansichten), damit er Ergebnisse zuordnen kann.
4. **Darstellung wie die übrige Homepage:** Dieselben Defizite wie auf anderen Seiten beheben: dynamische Seitenbreite statt schmaler Mitte (`--seitenbreite` in `css/style.css`), einheitliches Design, Navbar und Footer der Homepage, selbst gehostete Schriften (keine Google-Fonts), Schrift mindestens 16 px.

## Vorgehen

1. **Bestandsaufnahme:** `reso-backend/api.py`, `kolosseum/routes/auth.js`, `kolosseum/db/database.js` und die RegelRadar-Seiten lesen. Skizziere Jan in 5 bis 8 Sätzen, wie du Login-Verknüpfung und Datenmodell lösen willst, und lass ihn bei echten Alternativen per Auswahlfrage entscheiden. Wichtige Entscheidung: **Wo liegen die Ergebnisse?**
   - Option A: Ergebnisse wandern in die Kolosseum-Datenbank (ein Backend, ein Login, einfacher). Dann gehört die Auswertung ins Kolosseum-Admin.
   - Option B: `reso-api` bleibt, bekommt aber eine Prüfung der Kolosseum-Session (Schüler) bzw. Admin-Session (Jan) statt Token/Klassencode.
   Empfehlung vorab: Option A, wenn der Aufwand überschaubar ist, weil dann Login, Rechte und Auswertung an einer Stelle liegen.
2. **Backend:** Ergebnis wird einem eingeloggten Schüler-Account zugeordnet; echter Name wird zusätzlich gespeichert, nur Admin-lesbar. Auswertungs-Endpunkte sind nur für Admin (Jan). Bestehende Ergebnisse nicht verlieren (Migration oder alte Tabelle unangetastet lassen). Eingaben validieren, SQL nur mit Parametern.
3. **Schüler-Frontend:** Selbsttest startet ohne Klassencode. Ist niemand eingeloggt, freundlicher Hinweis mit Link zum Login. Danach Zwischenschritt „Dein echter Name" und der bestehende Test.
4. **Lehrkraft-Ansicht:** Token-Eingabe entfernen. Gleiche vier Bereiche behalten (Ergebnisliste, Heatmap, Schülerprofil), „Klassen verwalten" nur falls noch nötig. Zugang nur mit Admin-Login, sonst Weiterleitung zum Admin-Login. Sichtbar sind Name (echt) und Account-Name nebeneinander.
5. **Gestaltung:** Alle RegelRadar-Seiten an die Homepage angleichen (Navbar, Header wie `abgabe-header`, Footer, Breite, Schrift). Eigene Farben/Logik der Tests dürfen bleiben. Die Seiten `regelradar-selbsttest*.html` sind große Einzeldateien; Änderungen vorsichtig und mit Test im Browser.
6. **Test:** Mit Playwright (Chromium unter `/opt/pw-browsers/chromium`) bei 1920 px und 420 px prüfen; API-Antworten mit `page.route` mocken. Backend lokal starten, soweit möglich, und Endpunkte mit curl prüfen.
7. **Dokumentation:** Abschnitt „RegelRadar" in `CLAUDE.md` aktualisieren (neuer Login-Ablauf, Endpunkte, Token entfällt oder bleibt als Fallback). Eintrag in `neuigkeiten.json` („RegelRadar: Diagnostik direkt mit dem Homepage-Login"). Sichtbarer Name bleibt „RegelRadar", nicht „RESO".

## Regeln

- Der Pfad `/reso-api`, der Dienst `reso-api` und das Verzeichnis `reso-backend/` behalten ihren Namen.
- `reso-deploy/` ist ein separater Deploy-Stand mit eigener `CLAUDE.md`, nicht ändern, außer Jan will es.
- Keine Frameworks, kein npm für das Frontend. Datenschutz: echter Name nur für Jan, in Datenschutzseite erwähnen, falls sich die Datenverarbeitung ändert (Jan fragen).
- Vorab keine Tokens oder Secrets in Dateien schreiben.
- Deploy: Nach Merge auf `main` zieht der Server automatisch (GitHub-Webhook). Python-Änderungen am Backend brauchen zusätzlich einen Neustart von `reso-api` per SSH. Sag Jan genau, welcher Befehl nötig ist.

## Abschlussbericht an Jan

Kurz und klar: Was ist umgesetzt, was konnte nicht geprüft werden, welche manuellen Server-Schritte sind nötig. Keine Annahmen erfinden; bei Unklarheiten per Auswahlfrage nachfragen.
