"""
RESO API – FastAPI + SQLite Backend  v2.0
Endpunkte:
  POST   /klasse                (auth) → Klasse anlegen
  GET    /klasse/{code}         (public) → Klasseninfo
  GET    /klassen               (auth) → alle Klassen
  DELETE /klasse/{code}         (auth) → Klasse + alle Ergebnisse löschen

  POST   /ergebnis              (public) → Schülerergebnis einreichen (inkl. Einzelitems)
  GET    /ergebnisse/{code}     (auth) → Übersicht aller Ergebnisse einer Klasse
  GET    /ergebnis/{id}/items   (auth) → Einzelitems eines Ergebnisses (für Dashboard)
  DELETE /ergebnis/{id}         (auth) → Ergebnis löschen
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import sqlite3, os, json, random, string
from datetime import datetime

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="RESO API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.environ.get("RESO_DB", "/opt/reso/reso.db")
TOKEN   = os.environ.get("RESO_TOKEN", "changeme")
security = HTTPBearer()

# ── Datenbank ──────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS klassen (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT    NOT NULL,
            code      TEXT    UNIQUE NOT NULL,
            erstellt  TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ergebnisse (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            klasse_code    TEXT    NOT NULL,
            schueler_name  TEXT    NOT NULL,
            stufe          INTEGER NOT NULL DEFAULT 1,
            format         TEXT    NOT NULL,
            variante       INTEGER NOT NULL DEFAULT 1,
            kategorien     TEXT    NOT NULL,
            items          TEXT,
            eingereicht    TEXT    NOT NULL,
            FOREIGN KEY (klasse_code) REFERENCES klassen(code)
        );

        -- Migration: items-Spalte ergänzen falls sie fehlt (für ältere DBs)
        -- SQLite ignoriert diesen Befehl wenn die Spalte schon existiert:
        -- (Wird als separates Statement ausgeführt)
    """)
    # items-Spalte nachrüsten wenn nötig (ALTER TABLE IF NOT EXISTS gibt es in SQLite nicht)
    try:
        conn.execute("ALTER TABLE ergebnisse ADD COLUMN items TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE ergebnisse ADD COLUMN stufe INTEGER NOT NULL DEFAULT 1")
    except Exception:
        pass
    conn.commit()
    conn.close()

init_db()

# ── Auth ───────────────────────────────────────────────────────────────────────
def verify_token(creds: HTTPAuthorizationCredentials = Depends(security)):
    if creds.credentials != TOKEN:
        raise HTTPException(status_code=401, detail="Ungültiger Token")
    return creds.credentials

def gen_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# ── Modelle ────────────────────────────────────────────────────────────────────
class KlasseCreate(BaseModel):
    name: str

class ItemResponse(BaseModel):
    """Einzelne Schülerantwort auf eine Lücke"""
    nr:       int           # laufende Nummer im Test
    satz:     Optional[str] # Satzkontext (optional)
    wort:     str           # korrektes Wort (Lupenstelle)
    eingabe:  str           # was der Schüler getippt hat
    richtig:  bool
    kat:      int           # Kategorie 2–8
    format:   Optional[str] # z. B. "diktat", "selbsttest"

class ErgebnisCreate(BaseModel):
    klasse_code:   str
    schueler_name: str
    stufe:         int = 1          # 1=Diktat, 2=Selbsttest, 3=Strategie, 4=Quatsch
    format:        str              # "diktat" | "selbsttest" | "strategie" | "quatsch"
    variante:      int = 1
    # Zusammenfassung pro Kategorie (für schnellen Überblick)
    kategorien:    Dict[str, Dict[str, int]]  # {"2": {"richtig": 4, "gesamt": 12}, ...}
    # Einzelitems (optional – für Detailansicht im Dashboard)
    items:         Optional[List[ItemResponse]] = None

# ── Klassen ────────────────────────────────────────────────────────────────────
@app.post("/klasse", dependencies=[Depends(verify_token)], status_code=201)
def klasse_erstellen(data: KlasseCreate):
    conn = get_db()
    for _ in range(5):
        code = gen_code()
        try:
            conn.execute(
                "INSERT INTO klassen (name, code, erstellt) VALUES (?, ?, ?)",
                (data.name.strip(), code, datetime.now().isoformat())
            )
            conn.commit()
            conn.close()
            return {"code": code, "name": data.name.strip()}
        except sqlite3.IntegrityError:
            continue
    conn.close()
    raise HTTPException(status_code=500, detail="Code-Kollision")

@app.get("/klasse/{code}")
def klasse_info(code: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM klassen WHERE code = ?", (code.upper(),)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    return dict(row)

@app.get("/klassen", dependencies=[Depends(verify_token)])
def alle_klassen():
    conn = get_db()
    rows = conn.execute("SELECT * FROM klassen ORDER BY erstellt DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.delete("/klasse/{code}", dependencies=[Depends(verify_token)])
def klasse_loeschen(code: str):
    conn = get_db()
    conn.execute("DELETE FROM ergebnisse WHERE klasse_code = ?", (code.upper(),))
    conn.execute("DELETE FROM klassen WHERE code = ?", (code.upper(),))
    conn.commit()
    conn.close()
    return {"status": "gelöscht"}

# ── Ergebnisse ─────────────────────────────────────────────────────────────────
@app.post("/ergebnis", status_code=201)
def ergebnis_einreichen(data: ErgebnisCreate):
    conn = get_db()
    klasse = conn.execute(
        "SELECT code FROM klassen WHERE code = ?", (data.klasse_code.upper(),)
    ).fetchone()
    if not klasse:
        conn.close()
        raise HTTPException(status_code=404, detail="Klassencode nicht gefunden")

    items_json = json.dumps(
        [i.model_dump() for i in data.items] if data.items else []
    )
    conn.execute(
        """INSERT INTO ergebnisse
           (klasse_code, schueler_name, stufe, format, variante, kategorien, items, eingereicht)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.klasse_code.upper(),
            data.schueler_name.strip(),
            data.stufe,
            data.format,
            data.variante,
            json.dumps(data.kategorien),
            items_json,
            datetime.now().isoformat()
        )
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/ergebnisse/{code}", dependencies=[Depends(verify_token)])
def ergebnisse_abrufen(code: str):
    conn = get_db()
    klasse = conn.execute("SELECT * FROM klassen WHERE code = ?", (code.upper(),)).fetchone()
    if not klasse:
        conn.close()
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    rows = conn.execute(
        """SELECT id, klasse_code, schueler_name, stufe, format, variante,
                  kategorien, eingereicht
           FROM ergebnisse WHERE klasse_code = ?
           ORDER BY eingereicht DESC""",
        (code.upper(),)
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["kategorien"] = json.loads(d["kategorien"])
        result.append(d)
    return {"klasse": dict(klasse), "ergebnisse": result}

@app.get("/ergebnis/{ergebnis_id}/items", dependencies=[Depends(verify_token)])
def ergebnis_items_abrufen(ergebnis_id: int):
    """Detailansicht: alle Einzelantworten eines Schülers – für Dashboard / Elternsprechtag"""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM ergebnisse WHERE id = ?", (ergebnis_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Ergebnis nicht gefunden")
    d = dict(row)
    d["kategorien"] = json.loads(d["kategorien"])
    d["items"]      = json.loads(d["items"] or "[]")
    return d

@app.delete("/ergebnis/{ergebnis_id}", dependencies=[Depends(verify_token)])
def ergebnis_loeschen(ergebnis_id: int):
    conn = get_db()
    conn.execute("DELETE FROM ergebnisse WHERE id = ?", (ergebnis_id,))
    conn.commit()
    conn.close()
    return {"status": "gelöscht"}

@app.get("/")
def root():
    return {"status": "RESO API läuft", "version": "2.0"}
