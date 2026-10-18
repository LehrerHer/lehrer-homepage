# Auftrag für einen neuen Chat: Arena-Relaunch (Gladiatorenkämpfe)

Lies zuerst `CLAUDE.md` im Repo (Pflichtregeln für Git, Layout, Navbar/Footer).
Arbeite auf einem eigenen Feature-Branch `claude/arena-relaunch-<id>` und erstelle am Ende selbst einen Pull Request.
Vor dem Mergen frag Jan („Soll ich das jetzt mergen?"). Nichts direkt auf `main`.

**Empfehlung:** Dieses Paket ist groß und gestalterisch. Nutze ein starkes Modell (z. B. Opus) und arbeite in den Schritten unten, jeweils mit eigenem Commit.

## Hintergrund

Der Bereich „Arena – Lernkolosseum" wurde auf der Startseite in **„Gladiatorenkämpfe"** umbenannt (Kachel unten, nur mit Login). Jan hat die Arena mit einem Schüler-Account getestet. Der Bereich liegt in `kolosseum/` (Node.js, eigenes CSS `kolosseum/public/css/style.css`, eigene Navbar-Logik in `kolosseum/public/js/main.js`).

Dateien: `kolosseum/public/profil.html`, `rangliste.html`, `charakter.html`, `shop.html`, `kampf.html`, `quiz.html`, `quiz-spiel.html`, `js/arena-bar.js`, `js/avatar.js`, `js/charakter-avatar.js`.
Die Subnav steht aktuell in jeder Seite einzeln (`.kolosseum-subnav`, `.subnav-links`).

## Was bleibt (nicht ändern)

- Fünf Kämpfe pro Tag
- Anzeige der noch erreichbaren XP unten, mit Kategorisierung
- Kampfchronik
- Globale Navbar und Footer (Pflichtregel in `CLAUDE.md`), Login-Logik, XP-System

## Aufgaben

1. **Überschrift ändern:** Überall „Arena – Lernkolosseum" bzw. „Lernkolosseum" im sichtbaren Text durch **„Gladiatorenkämpfe"** ersetzen, wo der Bereich gemeint ist. Der Navbar-Tooltip „Arena" bleibt. Technische Pfade und Dateinamen nicht umbenennen.
2. **Einheitliche Navigation:** Profil, Rangliste, Charakter und **Shop** müssen von **jeder** dieser Seiten direkt erreichbar sein, auch während der Charaktererstellung. Aktuell fehlt z. B. der Weg Charakter → Shop und Profil → Charakter (nur über die Rangliste). Am besten eine gemeinsame Subnav-Komponente (ein Script, das die Leiste in alle Seiten einsetzt), statt sie pro Seite zu kopieren.
3. **Verständlichkeit (kleiner Relaunch der Struktur):** Für Schüler*innen ist unklar, was Shop, Charakter, Rangliste und Profil jeweils sind. Jede Seite bekommt eine kurze Erklärzeile direkt unter der Überschrift, und die Subnav-Einträge bekommen kurze Untertitel oder Tooltips. Vorschlag, den du prüfst:
   - Profil = meine Werte, XP, Abzeichen, Chronik
   - Charakter = mein Aussehen gestalten
   - Rangliste = wer ist wie weit
   - Shop = Münzen gegen Titel/Effekte tauschen
   Frag Jan nur bei echten Unklarheiten, mit Auswahlfragen zum Anklicken.
4. **Fantasy-Look:** Das Design wirkt veraltet und zu „schulisch". Wer dort ist, soll sich „weg von Schule" fühlen. Gestalte die Arena-Seiten deutlich fantasiehafter (z. B. dunkle Farbwelt, Pergament-/Stein-/Gold-Elemente, passende selbst gehostete Schrift). Regeln:
   - Schriften **selbst hosten** (WOFF2 in `assets/fonts/` oder passend im Kolosseum, Lizenz beilegen), nie per Google-CDN laden.
   - Kontrast mindestens WCAG AA, sichtbare Fokuszustände, Schrift mindestens 16 px.
   - Navbar und Footer bleiben unverändert in Struktur (schwebende Karten); nur Farben dürfen sich dem Bereich anpassen, solange es konsistent bleibt.
   - Keine Frameworks, kein npm, keine Bilder aus fremden Quellen ohne Lizenz. Eigene SVGs sind gut.
   - Navbar-CSS-Änderungen immer in **beiden** Stylesheets spiegeln (`css/style.css` und `kolosseum/public/css/style.css`).
5. **Charaktererstellung:** Die Unterschiede zwischen den **Klassen** (Ritter, Magier, Lehrer, Waldschrat, Bogenschütze) und den **Völkern** (Mensch, Zwerg, Elfe) müssen am erstellten Charakter **deutlich erkennbar** sein (Kleidung, Waffe/Attribut, Körperform, Ohren, Bart, Farben). Aktuell definieren `charakter.html` und `js/charakter-avatar.js` nur Farben. Erweitere die SVG-Avatare (`avatar.js`, `charakter-avatar.js`) so, dass man Klasse und Volk auf einen Blick erkennt. Prüfe, dass der Avatar auch in Profil, Rangliste und Kampf identisch aussieht.
6. **Seitenbreite:** Im Kolosseum-CSS wird auf großen Monitoren viel Rand verschenkt (feste `max-width: 1100px`). Inhalt soll sich dynamisch ausdehnen, wie auf der Hauptseite (`--seitenbreite`, siehe `css/style.css`). Gilt für alle Arena-Seiten, auch die Admin-Seiten, soweit sinnvoll.

## Vorgehen

1. Bestandsaufnahme: alle betroffenen Seiten in der Arena durchsehen und eine kurze Liste der Probleme anlegen.
2. Reihenfolge: Subnav-Komponente (2) → Texte (1, 3) → Breite (6) → Fantasy-Look (4) → Avatare (5).
3. Mit Playwright (Chromium ist unter `/opt/pw-browsers/chromium` vorinstalliert) Screenshots bei 1920 px und 420 px prüfen. Seiten mit Login-Pflicht lassen sich mit gemockten API-Antworten (`page.route`) ansehen.
4. Nach jedem Schritt committen (`-c user.email="jan@lehrer-herrmann.de" -c user.name="Jan Herrmann"`), am Ende pushen und PR erstellen.
5. In `neuigkeiten.json` einen Eintrag „Gladiatorenkämpfe: neues Aussehen und einheitliche Navigation" ergänzen, `CLAUDE.md` bei Strukturänderungen aktualisieren.

## Abschlussbericht an Jan

Kurz und klar: Was ist umgesetzt, was nicht geprüft werden konnte, was bleibt offen. Keine Annahmen erfinden; bei Unklarheiten per Auswahlfrage nachfragen.
