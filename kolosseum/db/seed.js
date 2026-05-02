// Demo-Quizze anlegen – einmalig ausführen: node db/seed.js
// Bereits vorhandene Quizze werden NICHT doppelt angelegt.

require('dotenv').config();
const { db } = require('./database');

const QUIZZE = [
  {
    title: 'Deutsch: Wortarten',
    subject: 'Deutsch',
    questions: [
      {
        question_text: 'Welches Wort ist ein Nomen (Substantiv)?',
        options: ['laufen', 'schön', 'Hund', 'schnell'],
        correct_index: 2,
        xp_value: 15,
      },
      {
        question_text: 'Welche Wortart beschreibt ein Verb am besten?',
        options: ['Es benennt Dinge und Personen.', 'Es drückt eine Tätigkeit oder einen Zustand aus.', 'Es beschreibt ein Nomen näher.', 'Es verbindet Sätze.'],
        correct_index: 1,
        xp_value: 15,
      },
      {
        question_text: 'Was ist ein Adjektiv?',
        options: ['Ein Tunwort', 'Ein Namenwort', 'Ein Eigenschaftswort', 'Ein Fügewort'],
        correct_index: 2,
        xp_value: 15,
      },
      {
        question_text: 'Welches Wort ist ein Pronomen?',
        options: ['Tisch', 'rennen', 'groß', 'sie'],
        correct_index: 3,
        xp_value: 15,
      },
      {
        question_text: 'Welcher Satz enthält ein Adverb?',
        options: ['Der Hund ist groß.', 'Er läuft schnell.', 'Das ist ein Haus.', 'Sie singt laut ein Lied.'],
        correct_index: 1,
        xp_value: 15,
      },
    ],
  },
  {
    title: 'Mathematik: Rechenregeln',
    subject: 'Mathematik',
    questions: [
      {
        question_text: 'Was ergibt 7 × 8?',
        options: ['54', '56', '48', '63'],
        correct_index: 1,
        xp_value: 15,
      },
      {
        question_text: 'Welche Rechenregel gilt: „Punkt vor Strich"?',
        options: ['Addition vor Subtraktion', 'Multiplikation und Division vor Addition und Subtraktion', 'Klammern zuletzt', 'Subtraktion vor Multiplikation'],
        correct_index: 1,
        xp_value: 15,
      },
      {
        question_text: 'Was ist der Flächeninhalt eines Rechtecks mit Länge 5 cm und Breite 3 cm?',
        options: ['8 cm²', '16 cm²', '15 cm²', '12 cm²'],
        correct_index: 2,
        xp_value: 15,
      },
      {
        question_text: 'Welcher Bruch ist gleich 0,5?',
        options: ['1/4', '2/3', '1/2', '3/5'],
        correct_index: 2,
        xp_value: 15,
      },
      {
        question_text: 'Was ergibt 25 % von 200?',
        options: ['25', '40', '50', '75'],
        correct_index: 2,
        xp_value: 15,
      },
    ],
  },
  {
    title: 'Allgemeinwissen: Deutschland',
    subject: 'Allgemeinwissen',
    questions: [
      {
        question_text: 'Was ist die Hauptstadt von Deutschland?',
        options: ['Hamburg', 'München', 'Frankfurt', 'Berlin'],
        correct_index: 3,
        xp_value: 15,
      },
      {
        question_text: 'Wie viele Bundesländer hat Deutschland?',
        options: ['14', '15', '16', '17'],
        correct_index: 2,
        xp_value: 15,
      },
      {
        question_text: 'Welcher Fluss fließt durch Köln?',
        options: ['Elbe', 'Rhein', 'Main', 'Weser'],
        correct_index: 1,
        xp_value: 15,
      },
      {
        question_text: 'In welchem Jahr wurde die Berliner Mauer gebaut?',
        options: ['1945', '1955', '1961', '1968'],
        correct_index: 2,
        xp_value: 15,
      },
      {
        question_text: 'Welches ist das höchste Gebirge Deutschlands?',
        options: ['Harz', 'Schwarzwald', 'Bayerische Alpen', 'Erzgebirge'],
        correct_index: 2,
        xp_value: 15,
      },
    ],
  },
];

let added = 0;
let skipped = 0;

for (const quizData of QUIZZE) {
  const existing = db.prepare('SELECT id FROM quizzes WHERE title = ?').get(quizData.title);
  if (existing) {
    console.log(`⏭  Übersprungen (existiert bereits): ${quizData.title}`);
    skipped++;
    continue;
  }

  const result = db.prepare(
    'INSERT INTO quizzes (title, subject) VALUES (?, ?)'
  ).run(quizData.title, quizData.subject);

  const quizId = result.lastInsertRowid;

  for (const q of quizData.questions) {
    db.prepare(
      'INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES (?, ?, ?, ?, ?)'
    ).run(quizId, q.question_text, JSON.stringify(q.options), q.correct_index, q.xp_value);
  }

  console.log(`✅ Angelegt: ${quizData.title} (${quizData.questions.length} Fragen)`);
  added++;
}

console.log(`\nFertig: ${added} angelegt, ${skipped} übersprungen.`);
