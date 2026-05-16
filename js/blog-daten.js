/* ============================================================
   SCHÜLER*INNENBLOG – Beitragsdaten
   Jan Herrmann · Oberschule Spelle

   So fügst du einen neuen Beitrag hinzu:
   1. Schüler*in reicht Datei ein (per Formular / E-Mail)
   2. Beitrag im Admin-Bereich genehmigen (kolosseum/public/admin/)
   3. Hier unten einen neuen Eintrag einfügen (nur als Fallback nötig).
      Kopiere einfach ein vorhandenes Objekt und passe es an.

   Felder:
   - id:          Fortlaufende Zahl (einfach hochzählen)
   - titel:       Titel / Überschrift des Beitrags
   - autor:       Vorname + erster Buchstabe des Nachnamens (Datenschutz)
   - klasse:      z. B. "7a"
   - fach:        "Deutsch" | "Geschichte" | "WiPo" | "Informatik"
   - datum:       ISO-Format "JJJJ-MM-TT"
   - beschreibung: Kurzer Einleitungstext (1–3 Sätze)
   - datei:       URL zur Datei (wird vom Server-API geliefert, z. B. "/uploads/blog/datei.pdf")
                  Leer lassen (""), wenn kein Anhang (nur Fallback-Daten)
   - dateiTyp:    "pdf" | "bild" | "text" | "sonstige"
   - vorschaubild: Pfad zu einem Vorschaubild (nur bei Bildbeiträgen),
                   sonst null
   ============================================================ */

const BLOG_BEITRAEGE = [

    {
        id: 3,
        titel: "Gedicht: Herbst in Spelle",
        autor: "Lena M.",
        klasse: "6b",
        fach: "Deutsch",
        datum: "2025-11-04",
        beschreibung: "Ein Gedicht über den Herbst, geschrieben im Rahmen unserer Lyrik-Einheit. Die Schülerin beschreibt die Natur mit lebhaften Bildern und eigenem Reim.",
        datei: "",
        dateiTyp: "text",
        vorschaubild: null,
        textinhalt: "Die Blätter fallen, rot und gold,\nder Wind flüstert, was niemand gewollt.\nDie Bäume stehen kahl und still,\nbis der Frühling wiederkommen will.\n\nIn Spelle liegt ein Hauch von Ruh,\ndie Felder schlafen, Natur auch du."
    },

    {
        id: 2,
        titel: "Plakat: Bundestagswahl – Wahlanalyse",
        autor: "Tim K.",
        klasse: "9a",
        fach: "WiPo",
        datum: "2025-10-20",
        beschreibung: "Tim hat das Ergebnis der letzten Bundestagswahl grafisch aufbereitet und analysiert, welche Parteien in welchen Altersgruppen besonders stark abschnitten.",
        datei: "",
        dateiTyp: "pdf",
        vorschaubild: null,
        textinhalt: null
    },

    {
        id: 1,
        titel: "Foto-Dokumentation: Ritter und Burgen",
        autor: "Sophie W.",
        klasse: "7b",
        fach: "Geschichte",
        datum: "2025-10-08",
        beschreibung: "Sophie hat ihren Ausflug zur Burg Bentheim fotografisch festgehalten und mit kurzen Infotexten über das Mittelalter versehen. Eine beeindruckende Dokumentation!",
        datei: "",
        dateiTyp: "bild",
        vorschaubild: null,
        textinhalt: null
    }

];
