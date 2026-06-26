#!/usr/bin/env python3
"""
sync-materialien.py – synchronisiert materialien/*.html → inhalte.json

Scannt alle HTML-Dateien in materialien/, liest den Metadaten-Kommentar
(Titel, Fach, Erstellt, AB-Typ) aus und fügt fehlende Einträge am Anfang
von inhalte.json ein (neueste zuerst).

Verwendung:
    python tools/sync-materialien.py            # prüfen + ergänzen
    python tools/sync-materialien.py --dry-run  # zeigt Änderungen, schreibt nichts
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
MATERIALIEN_DIR = ROOT / "materialien"
INHALTE_JSON = ROOT / "inhalte.json"

# Dateien, die grundsätzlich nicht in den Feed aufgenommen werden
AUSSCHLIESSEN = {
    "_template-karten-quiz.html",
    "lehrer-rebus-tabelle.html",  # interne Tabelle, kein öffentliches Material
    "ws-7f3k9q.html",             # privater Geheimlink
}

FACH_MAP = {
    "deutsch":           "deutsch",
    "geschichte":        "geschichte",
    "wipo":              "wipo",
    "informatik":        "informatik",
    "mathe":             "mathe",
    "mathematik":        "mathe",
    "englisch":          "englisch",
    "sport":             "sport",
    "biologie":          "biologie",
    "chemie":            "chemie",
    "physik":            "physik",
    "musik":             "musik",
    "erdkunde":          "erdkunde",
    "allgemein":         "faecheruebergreifend",
    "faecheruebergreifend": "faecheruebergreifend",
    "kultur":            "faecheruebergreifend",
    "schule":            "faecheruebergreifend",
    "arbeitsblatt":      "deutsch",
    "rechenblatt":       "mathe",
}

FACH_ICON = {
    "deutsch":              "📝",
    "geschichte":           "🏛️",
    "wipo":                 "💼",
    "informatik":           "💻",
    "mathe":                "➗",
    "englisch":             "🇬🇧",
    "sport":                "⚽",
    "biologie":             "🌿",
    "chemie":               "🧪",
    "physik":               "⚛️",
    "musik":                "🎵",
    "erdkunde":             "🗺️",
    "faecheruebergreifend": "🔀",
    "andere":               "📄",
}


def meta_aus_html(html: str) -> dict:
    """Liest den ersten HTML-Kommentar-Block als Metadaten-Header."""
    m = re.search(r"<!--\s*(.*?)\s*-->", html[:3000], re.DOTALL)
    if not m:
        return {}
    result = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            result[key.strip().lower()] = val.strip()
    return result


def datum_normalisieren(s: str) -> str:
    """Extrahiert JJJJ-MM-TT oder JJJJ-MM aus einem String."""
    if not s:
        return ""
    m = re.search(r"\d{4}-\d{2}-\d{2}", s)
    if m:
        return m.group(0)
    m = re.search(r"\d{4}-\d{2}", s)
    if m:
        return m.group(0) + "-01"
    return ""


def seite_aus_dateiname(name: str) -> str:
    prefix = name.split("_")[0].lower()
    return FACH_MAP.get(prefix, "andere")


def icon_waehlen(seite: str, titel: str, ab_typ: str) -> str:
    tl = (titel + " " + ab_typ).lower()
    if any(w in tl for w in ("rebus", "rätsel", "raetsel", "bilderraten")):
        return "🧩"
    if "quiz" in tl:
        return {"sport": "🏆", "erdkunde": "🗺️", "deutsch": "📖", "geschichte": "🏛️"}.get(seite, "⚔️")
    if "lese" in tl:
        return "🦉"
    if any(w in tl for w in ("zahlen", "rechen", "mathe")):
        return "🔢"
    if "drama" in tl or "theaterprojekt" in tl or "maske" in tl:
        return "🎭"
    if "prag" in tl or "burg" in tl or "mittelalter" in tl:
        return "🏰"
    return FACH_ICON.get(seite, "📄")


def eintrag_erstellen(html_path: Path, bestehende_ids: set) -> dict:
    html = html_path.read_text(encoding="utf-8", errors="replace")
    meta = meta_aus_html(html)

    # Titel
    titel = meta.get("titel", "")
    if not titel:
        m = re.search(r"<title>(.*?)</title>", html[:3000], re.IGNORECASE)
        if m:
            titel = m.group(1)
            titel = re.sub(r"\s*[–-]\s*lehrer-herrmann\.de.*", "", titel).strip()
            titel = re.sub(r"\s*\|\s*Jan Herrmann.*", "", titel).strip()
        else:
            titel = html_path.stem.replace("_", " ").replace("-", " ").title()

    # Datum
    datum = datum_normalisieren(meta.get("erstellt", ""))
    if not datum:
        m = re.search(r"_(\d{4}-\d{2})(?:-\d+)?\.html$", html_path.name)
        datum = (m.group(1) + "-01") if m else datetime.now().strftime("%Y-%m-%d")

    # Fach / Seite
    fach_meta = meta.get("fach", "")
    seite = seite_aus_dateiname(html_path.name)
    if fach_meta:
        for key in FACH_MAP:
            if key in fach_meta.lower():
                seite = FACH_MAP[key]
                break

    ab_typ = meta.get("ab-typ", "")
    klasse = meta.get("klasse/niveau", meta.get("klasse", ""))

    # Kurze Beschreibung
    beschreibung = ""
    if klasse and klasse.lower() not in ("nicht angegeben", ""):
        beschreibung = f"Jahrgang/Klasse: {klasse}"
    if ab_typ:
        beschreibung = (ab_typ + " · " + beschreibung).strip(" ·")

    icon = icon_waehlen(seite, titel, ab_typ)

    # Eindeutige ID (Millisekunden-Timestamp, bei Kollision +1)
    try:
        ts = int(datetime.fromisoformat(datum).replace(tzinfo=timezone.utc).timestamp() * 1000)
    except ValueError:
        ts = int(datetime.now(timezone.utc).timestamp() * 1000)

    while str(ts) in bestehende_ids:
        ts += 1
    bestehende_ids.add(str(ts))

    return {
        "id": str(ts),
        "titel": titel,
        "beschreibung": beschreibung,
        "icon": icon,
        "url": f"materialien/{html_path.name}",
        "seite": seite,
        "datum": datum,
    }


def sync(dry_run: bool = False) -> int:
    with open(INHALTE_JSON, encoding="utf-8") as f:
        data = json.load(f)

    materialien = data.get("materialien", [])
    vorhandene_urls = {m["url"] for m in materialien}
    bestehende_ids  = {m["id"] for m in materialien}

    neue = []
    for html_path in sorted(MATERIALIEN_DIR.glob("*.html")):
        if html_path.name in AUSSCHLIESSEN or html_path.name.startswith("_"):
            continue
        rel = f"materialien/{html_path.name}"
        if rel in vorhandene_urls:
            continue
        eintrag = eintrag_erstellen(html_path, bestehende_ids)
        neue.append(eintrag)
        print(f"  + {html_path.name}")
        print(f"    Titel:  {eintrag['titel']}")
        print(f"    Datum:  {eintrag['datum']}  |  Seite: {eintrag['seite']}")

    if not neue:
        print("Keine neuen Materialien – inhalte.json ist aktuell.")
        return 0

    if dry_run:
        print(f"\n{len(neue)} neue Einträge gefunden (--dry-run, kein Schreiben).")
        return len(neue)

    # Neueste zuerst einfügen
    neue.sort(key=lambda x: x["datum"], reverse=True)
    data["materialien"] = neue + materialien

    with open(INHALTE_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"\n✓ {len(neue)} neue Einträge in inhalte.json eingefügt.")
    return len(neue)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchronisiert materialien/ → inhalte.json")
    parser.add_argument("--dry-run", action="store_true", help="Zeigt Änderungen ohne zu schreiben")
    args = parser.parse_args()
    sys.exit(0 if sync(dry_run=args.dry_run) >= 0 else 1)
