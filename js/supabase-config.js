/* ============================================================
   SUPABASE-KONFIGURATION
   Jan Herrmann · Oberschule Spelle

   ============================================================
   EINMALIGE EINRICHTUNG (ca. 10 Minuten, dauerhaft kostenlos):
   ============================================================

   SCHRITT 1 – Konto anlegen
   ─────────────────────────
   → https://supabase.com aufrufen und kostenlos registrieren
   → "New project" klicken, Name vergeben (z. B. "schuelerblog")
   → Passwort merken (für die Datenbank), Region: "Central EU"
   → Ca. 2 Minuten warten bis das Projekt bereit ist

   SCHRITT 2 – Datenbanktabelle anlegen
   ──────────────────────────────────────
   → Links auf "SQL Editor" klicken
   → Diesen SQL-Code einfügen und auf "Run" klicken:

   ┌─────────────────────────────────────────────────────────┐
   │  CREATE TABLE blog_beitraege (                          │
   │    id           bigserial PRIMARY KEY,                  │
   │    titel        text not null,                          │
   │    autor        text not null,                          │
   │    klasse       text not null,                          │
   │    fach         text not null,                          │
   │    datum        timestamptz default now(),              │
   │    beschreibung text,                                   │
   │    datei_url    text,                                   │
   │    datei_typ    text                                    │
   │  );                                                     │
   │                                                         │
   │  ALTER TABLE blog_beitraege                             │
   │    ENABLE ROW LEVEL SECURITY;                           │
   │                                                         │
   │  CREATE POLICY "Lesen"                                  │
   │    ON blog_beitraege FOR SELECT USING (true);           │
   │                                                         │
   │  CREATE POLICY "Einreichen"                             │
   │    ON blog_beitraege FOR INSERT WITH CHECK (true);      │
   └─────────────────────────────────────────────────────────┘

   SCHRITT 3 – Datei-Speicher anlegen
   ────────────────────────────────────
   → Links auf "Storage" klicken
   → "New bucket" klicken
     - Name: blog-beitraege
     - "Public bucket" aktivieren  ← wichtig!
     - "Create bucket" klicken
   → Auf den neuen Bucket klicken → "Policies" → "New policy"
     → "Full customization" wählen:
       Policy name: Hochladen erlaubt
       Allowed operation: INSERT
       Target roles: anon
       → "Review" → "Save policy"

   SCHRITT 4 – Zugangsdaten eintragen
   ────────────────────────────────────
   → Links auf "Settings" → "API" klicken
   → "Project URL" kopieren → unten bei SUPABASE_URL eintragen
   → "anon" / "public" Key kopieren → unten bei SUPABASE_KEY eintragen

   ============================================================ */


/* ↓↓↓ HIER DEINE ZUGANGSDATEN EINTRAGEN ↓↓↓ */

const SUPABASE_URL = 'https://DEIN-PROJEKT.supabase.co';
const SUPABASE_KEY = 'DEIN-ANON-KEY';

/* ↑↑↑ HIER DEINE ZUGANGSDATEN EINTRAGEN ↑↑↑ */


/* Wird automatisch erkannt – nicht ändern */
const SUPABASE_KONFIGURIERT = (
    SUPABASE_URL !== 'https://DEIN-PROJEKT.supabase.co' &&
    SUPABASE_KEY !== 'DEIN-ANON-KEY'
);
