#!/usr/bin/env python3
"""
AB-Generator — Arbeitsblatt-Automatisierung
Beobachtet upload/, schickt neue Dateien an die Claude API und speichert
die generierten interaktiven Arbeitsblätter in materialien/.

Voraussetzungen:
    pip install -r tools/requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...

Verwendung:
    python tools/ab_generator.py

Der Ordner upload/ wird alle 10 Sekunden geprüft. Unterstützte Formate:
PDF, JPG, PNG, TXT, MD. Verarbeitete Originale landen in upload/_erledigt/.
"""

import base64
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import anthropic

ROOT = Path(__file__).parent.parent
UPLOAD_DIR = ROOT / "upload"
OUTPUT_DIR = ROOT / "materialien"
DONE_DIR = UPLOAD_DIR / "_erledigt"

SUPPORTED = {".pdf", ".jpg", ".jpeg", ".png", ".txt", ".md"}

POLL_INTERVAL = 10  # Sekunden

SYSTEM_PROMPT = """\
Du bist ein spezialisierter Assistent für Jan Herrmann (Lehrer an der OBS Spelle) \
und sein Kollegium. Deine Aufgabe: Hochgeladene Arbeitsblätter (PDF, Bild oder Text) \
in interaktive, eigenständige HTML-Dateien umwandeln, die direkt auf einer statischen \
Lehrer-Homepage eingebettet werden können.

## Ausgabe

Erzeuge IMMER eine vollständige, standalone HTML-Datei mit:
- Eingebettetem CSS (kein externes Stylesheet)
- Eingebettetem JavaScript (keine externen Bibliotheken außer cdn.jsdelivr.net \
für spezifische Komponenten)
- Responsivem Design (funktioniert auf Schüler-Smartphones)

## Designsystem

- Schriftart: system-ui, sans-serif
- Primärfarbe: #1e3a5f (Dunkelblau — Überschriften, Buttons)
- Akzentfarbe: #4a9eda (Hellblau — Links, Fokus-Zustände)
- Korrekt-Feedback: #2ecc71 (Grün)
- Fehler-Feedback: #e74c3c (Rot)
- Hintergrund: #f4f6f7
- Karten-Hintergrund: #ffffff, border-radius: 8px, box-shadow
- Maximale Breite: 800px, zentriert

## AB-Typen und ihre Umsetzung

Lückentext: Input-Felder inline im Text, Auswertung per Button, Feedback pro Lücke + Gesamtpunktzahl
Multiple Choice: Radio-Buttons oder Checkboxen, klares Feedback nach Abgabe, kein Mehrfachversuch ohne Reset
Zuordnung: Drag & Drop oder Dropdown-Menüs je nach Komplexität
Textanalyse / offen: Textarea mit Zeichenzähler, Musterlösung aufklappbar (zunächst verborgen)
Schreibaufgabe: Strukturierte Textfelder mit Hilfestellungen, optionale Bewertungsrubrik einblendbar
Sonstiges: Typ selbst erkennen, passendste interaktive Umsetzung wählen

## Pflichtregeln für die HTML-Ausgabe

**Zeilennummern:** Wenn der Originaltext Zeilennummern enthält oder Aufgaben auf \
Zeilen verweisen, nummeriere ausschließlich echte Textzeilen. Leerzeilen und \
Überschriften erhalten keine Zeilennummer.

**Interne Links:** Jeder Link zu einer Aufgabe, einem Abschnitt oder einer \
Materialangabe (z.B. "Aufgabe 1", "siehe Text Z. 3") muss auf eine existierende \
Anker-ID (`id="..."`) im selben HTML-Dokument verweisen. Erzeuge keine Links, \
die ins Leere führen.

**Materialkennzeichnung:** Bezeichnungen wie "M1", "M2" nur verwenden, wenn \
tatsächlich mehrere Materialien vorhanden sind. Bei einem einzelnen Text oder \
Bild entfällt die Nummerierung.

## Metadaten-Header (immer einfügen)

Jede HTML-Datei beginnt mit:
<!--
  Titel: [Titel des AB]
  Fach: [erkanntes Fach]
  Klasse/Niveau: [erkanntes Niveau oder "nicht angegeben"]
  AB-Typ: [Lückentext / MC / Zuordnung / Offen / Gemischt]
  Erstellt: [Datum]
  Quelle: [Originalformat des hochgeladenen Dokuments]
-->

## Dateiname

Schreibe nach dem schließenden </html>-Tag exakt eine Zeile:
DATEINAME: fach_thema_klasse_JJJJ-MM.html

## Hinweise nach der Ausgabe

Gib nach der DATEINAME-Zeile kurz an:
- Welche Inhalte nicht eindeutig erkannt werden konnten
- Ob Musterlösungen fehlen und nachgereicht werden sollten
- Ob Annahmen über das Niveau getroffen wurden

Antworte auf Deutsch.
"""


def build_content_block(path: Path) -> dict:
    ext = path.suffix.lower()
    if ext in {".txt", ".md"}:
        return {"type": "text", "text": path.read_text(encoding="utf-8", errors="replace")}
    data = base64.standard_b64encode(path.read_bytes()).decode()
    if ext == ".pdf":
        return {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data}}
    media = "image/jpeg" if ext in {".jpg", ".jpeg"} else "image/png"
    return {"type": "image", "source": {"type": "base64", "media_type": media, "data": data}}


def extract_html(text: str) -> str:
    if "<!DOCTYPE html>" in text:
        start = text.index("<!DOCTYPE html>")
        end = text.rfind("</html>")
        if end != -1:
            return text[start : end + 7]
    return text


def extract_filename(text: str, fallback: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("DATEINAME:"):
            name = stripped.split(":", 1)[1].strip()
            if name.endswith(".html") and "/" not in name:
                return name
    return fallback


def git_commit_push(html_path: Path) -> None:
    rel = str(html_path.relative_to(ROOT))
    subprocess.run(["git", "add", rel], cwd=ROOT, check=True)
    subprocess.run(
        ["git", "commit", "-m", f"AB: {html_path.name} automatisch generiert"],
        cwd=ROOT,
        check=True,
    )
    # Vor dem Push remote-Änderungen holen, um Konflikte zu vermeiden
    subprocess.run(["git", "pull", "--rebase", "origin", "HEAD"], cwd=ROOT, check=True)
    subprocess.run(["git", "push", "-u", "origin", "HEAD"], cwd=ROOT, check=True)


def process_file(path: Path, client: anthropic.Anthropic) -> None:
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Verarbeite: {path.name}")

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    build_content_block(path),
                    {"type": "text", "text": "Bitte wandle dieses Arbeitsblatt in eine interaktive HTML-Datei um."},
                ],
            }
        ],
    )

    full_text = response.content[0].text
    html = extract_html(full_text)

    today = datetime.now().strftime("%Y-%m")
    fallback = f"arbeitsblatt_{path.stem}_{today}.html"
    filename = extract_filename(full_text, fallback)

    OUTPUT_DIR.mkdir(exist_ok=True)
    out_path = OUTPUT_DIR / filename
    out_path.write_text(html, encoding="utf-8")
    print(f"  → Gespeichert: materialien/{filename}")

    # Hinweise ausgeben (Text nach </html>)
    after_html = ""
    if "</html>" in full_text:
        after_html = full_text[full_text.rfind("</html>") + 7 :]
    for line in after_html.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("DATEINAME:"):
            print(f"  ℹ {stripped}")

    try:
        git_commit_push(out_path)
        print(f"  → Git: committed & pushed")
    except subprocess.CalledProcessError as e:
        print(f"  ⚠ Git-Fehler: {e}\n    HTML wurde lokal gespeichert, manueller Push nötig.")

    DONE_DIR.mkdir(exist_ok=True)
    path.rename(DONE_DIR / path.name)
    print(f"  → Original verschoben nach upload/_erledigt/")


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit(
            "Fehler: Umgebungsvariable ANTHROPIC_API_KEY nicht gesetzt.\n"
            "Bitte ausführen: export ANTHROPIC_API_KEY=sk-ant-..."
        )

    client = anthropic.Anthropic(api_key=api_key)
    UPLOAD_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("AB-Generator gestartet.")
    print(f"  Eingang:  {UPLOAD_DIR}")
    print(f"  Ausgang:  {OUTPUT_DIR}")
    print(f"  Intervall: {POLL_INTERVAL}s — Strg+C zum Beenden.\n")

    seen: set[Path] = set()

    while True:
        for path in sorted(UPLOAD_DIR.iterdir()):
            if path.is_dir() or path.suffix.lower() not in SUPPORTED:
                continue
            if path in seen:
                continue
            seen.add(path)
            try:
                process_file(path, client)
            except Exception as e:
                print(f"  ✗ Fehler bei {path.name}: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
