/**
 * deutschclub-reihen.js – feste Struktur der 4 Reihen des Deutschclubs (ZAP-Vorbereitung).
 * Jede Reihe hat 4 Module, die im Kreis durchlaufen werden (1→2→3→4→1…), unabhängig
 * von Kalenderdatum – nur an tatsächlich stattgefundene Stunden gekoppelt.
 *
 * Die Kurzbeschreibungen sind ein erster Entwurf und sollten durch Jans Originaltexte
 * ersetzt werden, sobald diese vorliegen.
 */
module.exports = [
  {
    id: 'hs9-texte',
    jahrgang: 'Jahrgang 9 (Hauptschulabschluss)',
    name: 'Texte und Medien lesen und produzieren',
    module: [
      { nr: 1, titel: 'Sachtexte sicher erschließen', beschreibung: 'Wir erarbeiten Strategien, um Sachtexte zielgerichtet zu lesen und die wichtigsten Informationen sicher herauszuarbeiten.' },
      { nr: 2, titel: 'Literarische Texte verstehen', beschreibung: 'Wir untersuchen literarische Texte und erschließen Handlung, Figuren und Aussageabsicht.' },
      { nr: 3, titel: 'Nicht-lineare Texte auswerten', beschreibung: 'Wir lesen und interpretieren Diagramme, Tabellen und andere nicht-lineare Texte prüfungsnah.' },
      { nr: 4, titel: 'Von der Textarbeit zum eigenen Text', beschreibung: 'Wir nutzen die Textarbeit als Grundlage, um eigene Texte planvoll zu verfassen.' },
    ],
  },
  {
    id: 'hs9-rechtschreibung',
    jahrgang: 'Jahrgang 9 (Hauptschulabschluss)',
    name: 'Rechtschreibung',
    module: [
      { nr: 1, titel: 'Rechtschreibstrategien kennen und anwenden', beschreibung: 'Wir wiederholen zentrale Rechtschreibstrategien und wenden sie gezielt an eigenen Texten an.' },
      { nr: 2, titel: 'Groß- und Kleinschreibung sicher anwenden und begründen', beschreibung: 'Wir festigen die Regeln der Groß- und Kleinschreibung und lernen, sie zu begründen.' },
      { nr: 3, titel: 'Satzbau und Zeichensetzung sicher anwenden', beschreibung: 'Wir trainieren Satzbau und Zeichensetzung anhand typischer Prüfungsaufgaben.' },
      { nr: 4, titel: 'Fehlerquotient verstehen und eigene Texte kontrollieren', beschreibung: 'Wir lernen den Fehlerquotienten kennen und kontrollieren eigene Texte systematisch.' },
    ],
  },
  {
    id: 'rs10-sachtexte',
    jahrgang: 'Jahrgang 10 (Realschulabschluss)',
    name: 'Sachtexte und Medien lesen und produzieren',
    module: [
      { nr: 1, titel: 'Sachtexte mit System erschließen – Operatoren verstehen', beschreibung: 'Wir klären die wichtigsten Operatoren und erschließen Sachtexte methodisch.' },
      { nr: 2, titel: 'Mehrere Materialien vergleichen und bewerten', beschreibung: 'Wir vergleichen mehrere Materialien miteinander und bewerten sie kritisch.' },
      { nr: 3, titel: 'Argumentieren mit Belegen', beschreibung: 'Wir üben, Argumente sauber mit Textbelegen zu stützen.' },
      { nr: 4, titel: 'Vom Material zum eigenen Text – Schreibplan & Wahlteil', beschreibung: 'Wir erstellen einen Schreibplan und bearbeiten den Wahlteil der Prüfung.' },
    ],
  },
  {
    id: 'rs10-literatur',
    jahrgang: 'Jahrgang 10 (Realschulabschluss)',
    name: 'Literatur lesen und Texte produzieren',
    module: [
      { nr: 1, titel: 'Literarische Texte mit System erschließen – Operatoren verstehen', beschreibung: 'Wir klären die wichtigsten Operatoren und erschließen literarische Texte methodisch.' },
      { nr: 2, titel: 'Figuren und Werthaltungen deuten', beschreibung: 'Wir deuten Figuren und ihre Werthaltungen anhand des Textes.' },
      { nr: 3, titel: 'Textbelege und Zitieren', beschreibung: 'Wir üben, Textbelege korrekt einzubinden und richtig zu zitieren.' },
      { nr: 4, titel: 'Vom Text zum eigenen Schreiben – Stellungnahme mit Zitaten', beschreibung: 'Wir verfassen eine eigene Stellungnahme und stützen sie mit passenden Zitaten.' },
    ],
  },
];
