"""
RESO API – FastAPI + SQLite Backend
Endpunkte:
  POST /klasse           (auth) → Klasse anlegen
  GET  /klasse/{code}    (public) → Klasseninfo
  GET  /klassen          (auth) → alle Klassen
  POST /ergebnis         (public) → Schülerergebnis einreichen
  GET  /ergebnisse/{code}(auth) → alle Ergebnisse einer Klasse
  DELETE /ergebnis/{id}  (auth) → Ergebnis löschen
  DELETE /klasse/{code}  (auth) → Klasse löschen
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import sqlite3, os, json, random, string
from datetime import datetime

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="RESO API", version="1.0")

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
            klasse_code    TEXT NOT NULL,
            schueler_name  TEXT NOT NULL,
            format         TEXT NOT NULL,
            variante       INTEGER NOT NULL,
            kategorien     TEXT NOT NULL,
            eingereicht    TEXT NOT NULL,
            FOREIGN KEY (klasse_code) REFERENCES klassen(code)
        );
    """)
    conn.commit()
    conn.close()

init_db()

# ── Auth ───────────────────────────────────────────────────────────────────────
def verify_token(creds: HTTPAuthorizationCredentials = Depends(security)):
    if creds.credentials != TOKEN:
        raise HTTPException(status_code=401, detail="Ungültiger Token")
    return creds.credentials

def gen_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

# ── Modelle ────────────────────────────────────────────────────────────────────
class KlasseCreate(BaseModel):
    name: str

class ErgebnisCreate(BaseModel):
    klasse_code:   str
    schueler_name: str
    format:        str    # "selbsttest"
    variante:      int
    # {"2": {"richtig": 4, "gesamt": 5}, "3": {...}, ...}
    kategorien:    Dict[str, Dict[str, int]]

# ── Endpunkte ──────────────────────────────────────────────────────────────────

@app.post("/klasse", dependencies=[Depends(verify_token)], status_code=201)
def klasse_erstellen(data: KlasseCreate):
    conn = get_db()
    for _ in range(5):          # bis zu 5 Versuche für eindeutigen Code
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
    row = conn.execute(
        "SELECT * FROM klassen WHERE code = ?", (code.upper(),)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    return dict(row)


@app.get("/klassen", dependencies=[Depends(verify_token)])
def alle_klassen():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM klassen ORDER BY erstellt DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/ergebnis", status_code=201)
def ergebnis_einreichen(data: ErgebnisCreate):
    conn = get_db()
    klasse = conn.execute(
        "SELECT code FROM klassen WHERE code = ?", (data.klasse_code.upper(),)
    ).fetchone()
    if not klasse:
        conn.close()
        raise HTTPException(status_code=404, detail="Klassencode nicht gefunden")
    conn.execute(
        """INSERT INTO ergebnisse
           (klasse_code, schueler_name, format, variante, kategorien, eingereicht)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            data.klasse_code.upper(),
            data.schueler_name.strip(),
            data.format,
            data.variante,
            json.dumps(data.kategorien),
            datetime.now().isoformat()
        )
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/ergebnisse/{code}", dependencies=[Depends(verify_token)])
def ergebnisse_abrufen(code: str):
    conn = get_db()
    klasse = conn.execute(
        "SELECT * FROM klassen WHERE code = ?", (code.upper(),)
    ).fetchone()
    if not klasse:
        conn.close()
        raise HTTPException(status_code=404, detail="Klasse nicht gefunden")
    rows = conn.execute(
        "SELECT * FROM ergebnisse WHERE klasse_code = ? ORDER BY eingereicht DESC",
        (code.upper(),)
    ).fetchall()
    conn.close()
    ergebnisse = []
    for r in rows:
        d = dict(r)
        d["kategorien"] = json.loads(d["kategorien"])
        ergebnisse.append(d)
    return {"klasse": dict(klasse), "ergebnisse": ergebnisse}


@app.delete("/ergebnis/{ergebnis_id}", dependencies=[Depends(verify_token)])
def ergebnis_loeschen(ergebnis_id: int):
    conn = get_db()
    conn.execute("DELETE FROM ergebnisse WHERE id = ?", (ergebnis_id,))
    conn.commit()
    conn.close()
    return {"status": "gelöscht"}


@app.delete("/klasse/{code}", dependencies=[Depends(verify_token)])
def klasse_loeschen(code: str):
    conn = get_db()
    conn.execute("DELETE FROM ergebnisse WHERE klasse_code = ?", (code.upper(),))
    conn.execute("DELETE FROM klassen WHERE code = ?", (code.upper(),))
    conn.commit()
    conn.close()
    return {"status": "gelöscht"}


@app.get("/")
def root():
    return {"status": "RESO API läuft"}
