function seedDemoData(db) {
  const count = db.prepare('SELECT COUNT(*) as n FROM quizzes').get().n;
  if (count > 0) return;

  const insertQuiz = db.prepare('INSERT INTO quizzes (title, subject) VALUES (?, ?)');
  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES (?, ?, ?, ?, ?)'
  );

  const quizzes = [
    {
      title: 'Mathematik: Grundrechenarten',
      subject: 'Mathematik',
      questions: [
        { text: 'Was ist 7 × 8?', options: ['54', '56', '63', '48'], correct: 1, xp: 10 },
        { text: 'Was ergibt 144 ÷ 12?', options: ['10', '11', '12', '13'], correct: 2, xp: 10 },
        { text: 'Was ist 25% von 200?', options: ['25', '40', '50', '75'], correct: 2, xp: 15 },
        { text: 'Welche Zahl ist eine Primzahl?', options: ['15', '21', '37', '49'], correct: 2, xp: 15 },
        { text: 'Was ist die Wurzel aus 169?', options: ['11', '12', '13', '14'], correct: 2, xp: 20 },
      ],
    },
    {
      title: 'Deutsch: Grammatik',
      subject: 'Deutsch',
      questions: [
        { text: 'Welches Wort ist ein Adjektiv?', options: ['laufen', 'schön', 'Haus', 'schnell rennen'], correct: 1, xp: 10 },
        { text: 'Was ist der Plural von „das Kind"?', options: ['die Kinden', 'die Kinder', 'die Kinds', 'die Kindes'], correct: 1, xp: 10 },
        { text: 'In welchem Satz steht ein Relativsatz?', options: ['Er schläft tief.', 'Das Buch, das ich lese, ist spannend.', 'Sie isst gerne Äpfel.', 'Wir gehen schwimmen.'], correct: 1, xp: 20 },
        { text: 'Welche Zeitform ist „Sie hatte geschlafen"?', options: ['Präsens', 'Präteritum', 'Plusquamperfekt', 'Futur I'], correct: 2, xp: 15 },
        { text: 'Was ist ein Synonym für „glücklich"?', options: ['traurig', 'froh', 'wütend', 'müde'], correct: 1, xp: 10 },
      ],
    },
    {
      title: 'Englisch: Basics',
      subject: 'Englisch',
      questions: [
        { text: 'What is the past tense of "go"?', options: ['goed', 'gone', 'went', 'going'], correct: 2, xp: 10 },
        { text: 'Which word means "Fahrrad"?', options: ['car', 'bus', 'bicycle', 'train'], correct: 2, xp: 10 },
        { text: 'Complete: "She ___ to school every day."', options: ['go', 'goes', 'going', 'gone'], correct: 1, xp: 15 },
        { text: 'What does "enormous" mean?', options: ['tiny', 'fast', 'huge', 'quiet'], correct: 2, xp: 15 },
        { text: 'Which sentence is correct?', options: ['I am go home.', 'I going home.', 'I am going home.', 'I goes home.'], correct: 2, xp: 20 },
      ],
    },
  ];

  for (const quiz of quizzes) {
    const { lastInsertRowid } = insertQuiz.run(quiz.title, quiz.subject);
    for (const q of quiz.questions) {
      insertQuestion.run(lastInsertRowid, q.text, JSON.stringify(q.options), q.correct, q.xp);
    }
  }

  console.log('Demo-Quizzes angelegt.');
}

module.exports = { seedDemoData };
