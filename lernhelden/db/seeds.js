function seedDemoData(db) {
  const count = db.prepare('SELECT COUNT(*) as n FROM quizzes').get().n;
  if (count > 0) return;

  const insertQuiz = db.prepare('INSERT INTO quizzes (title, subject, type, description) VALUES (?, ?, ?, ?)');
  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES (?, ?, ?, ?, ?)'
  );

  // ── Demo-Quizzes ──────────────────────────────────────────────
  const quizzes = [
    {
      title: 'Mathematik: Grundrechenarten',
      subject: 'Mathematik',
      type: 'quiz',
      description: 'Teste dein Rechnen – Multiplikation, Division, Prozente und Primzahlen.',
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
      type: 'quiz',
      description: 'Adjektive, Pluralformen, Zeitformen und Satztypen.',
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
      type: 'quiz',
      description: 'Vergangenheitsformen, Vokabeln und Grammatik auf Englisch.',
      questions: [
        { text: 'What is the past tense of "go"?', options: ['goed', 'gone', 'went', 'going'], correct: 2, xp: 10 },
        { text: 'Which word means "Fahrrad"?', options: ['car', 'bus', 'bicycle', 'train'], correct: 2, xp: 10 },
        { text: 'Complete: "She ___ to school every day."', options: ['go', 'goes', 'going', 'gone'], correct: 1, xp: 15 },
        { text: 'What does "enormous" mean?', options: ['tiny', 'fast', 'huge', 'quiet'], correct: 2, xp: 15 },
        { text: 'Which sentence is correct?', options: ['I am go home.', 'I going home.', 'I am going home.', 'I goes home.'], correct: 2, xp: 20 },
      ],
    },
  ];

  // ── Digitale Arbeitsblätter ───────────────────────────────────
  const arbeitsblätter = [
    {
      title: 'Deutsch: Kurztext analysieren',
      subject: 'Deutsch',
      type: 'arbeitsblatt',
      description: 'Lies den Kurztext und beantworte die Fragen zur Textanalyse. Thema: Aufbau und Inhalt eines Erzähltextes.',
      questions: [
        {
          text: 'Ein Erzähltext beginnt typischerweise mit …',
          options: [
            'dem Höhepunkt der Handlung',
            'einer Exposition, die Figuren und Situation vorstellt',
            'dem Ende der Geschichte',
            'einem Zitat des Autors',
          ],
          correct: 1,
          xp: 10,
        },
        {
          text: 'Was versteht man unter dem Begriff „Erzählperspektive"?',
          options: [
            'Den Stil des Schreibens (z.B. Metaphern)',
            'Den zeitlichen Ablauf der Geschichte',
            'Den Standpunkt, von dem aus eine Geschichte erzählt wird',
            'Die geografische Lage des Handlungsortes',
          ],
          correct: 2,
          xp: 10,
        },
        {
          text: 'Welche Erzählperspektive verwendet der Satz: „Ich sah den Mann einbiegen"?',
          options: ['Er-/Sie-Perspektive (auktorial)', 'Ich-Perspektive', 'Wir-Perspektive', 'Du-Perspektive'],
          correct: 1,
          xp: 10,
        },
        {
          text: 'Was ist ein „Stilmittel"?',
          options: [
            'Eine Schreibweise, die für besondere Wirkung im Text sorgt',
            'Die Handlung im Mittelpunkt des Textes',
            'Ein Fehler im Text',
            'Die Länge eines Textes',
          ],
          correct: 0,
          xp: 15,
        },
        {
          text: 'Der „Höhepunkt" einer Erzählung …',
          options: [
            '… ist immer am Anfang zu finden',
            '… beschreibt den Ort der Handlung',
            '… ist der spannendste Moment, an dem sich das Schicksal der Figuren entscheidet',
            '… erklärt die Vorgeschichte',
          ],
          correct: 2,
          xp: 15,
        },
      ],
    },
    {
      title: 'Mathematik: Textaufgaben',
      subject: 'Mathematik',
      type: 'arbeitsblatt',
      description: 'Lies jede Aufgabe genau und rechne Schritt für Schritt. Tipps: Gegeben, Gesucht, Rechnung, Antwort.',
      questions: [
        {
          text: 'Lena kauft 4 Hefte à 2,50 € und einen Stift für 1,20 €. Wie viel zahlt sie insgesamt?',
          options: ['10,00 €', '11,20 €', '9,80 €', '12,50 €'],
          correct: 1,
          xp: 15,
        },
        {
          text: 'Ein Zug fährt mit 120 km/h. Wie weit kommt er in 2,5 Stunden?',
          options: ['240 km', '300 km', '280 km', '350 km'],
          correct: 1,
          xp: 15,
        },
        {
          text: 'In einer Klasse sind 30 Schüler. 40% nehmen am Sportfest teil. Wie viele Schüler sind das?',
          options: ['10', '12', '14', '15'],
          correct: 1,
          xp: 15,
        },
        {
          text: 'Ein Rechteck hat die Länge 8 cm und die Breite 5 cm. Wie groß ist der Flächeninhalt?',
          options: ['26 cm²', '40 cm²', '35 cm²', '13 cm²'],
          correct: 1,
          xp: 10,
        },
        {
          text: 'Tim spart jeden Monat 25 €. Nach wie vielen Monaten hat er 300 € gespart?',
          options: ['10', '12', '8', '15'],
          correct: 1,
          xp: 10,
        },
      ],
    },
    {
      title: 'Englisch: Reading Comprehension',
      subject: 'Englisch',
      type: 'arbeitsblatt',
      description: 'Read the text carefully and answer the questions. Take your time – reading comprehension needs attention to detail!',
      questions: [
        {
          text: 'What does "comprehension" mean in the context of reading?',
          options: ['Writing a story', 'Understanding what you read', 'Translating a text', 'Memorising words'],
          correct: 1,
          xp: 10,
        },
        {
          text: 'Which strategy helps you understand an unknown word?',
          options: [
            'Skip it and move on',
            'Look at the context of the sentence',
            'Always use a dictionary first',
            'Guess randomly',
          ],
          correct: 1,
          xp: 10,
        },
        {
          text: 'What is a "main idea" in a text?',
          options: [
            'A small detail from the middle of the text',
            'The most important point the author wants to make',
            'The first sentence of every paragraph',
            'A question the reader asks',
          ],
          correct: 1,
          xp: 15,
        },
        {
          text: 'What does a topic sentence usually do?',
          options: [
            'It ends the paragraph',
            'It introduces the main idea of a paragraph',
            'It gives examples',
            'It is always a question',
          ],
          correct: 1,
          xp: 15,
        },
        {
          text: 'If an author writes "It was as cold as ice," this is an example of …',
          options: ['a metaphor', 'a simile', 'an alliteration', 'a hyperbole'],
          correct: 1,
          xp: 15,
        },
      ],
    },
  ];

  for (const item of [...quizzes, ...arbeitsblätter]) {
    const { lastInsertRowid } = insertQuiz.run(item.title, item.subject, item.type, item.description || null);
    for (const q of item.questions) {
      insertQuestion.run(lastInsertRowid, q.text, JSON.stringify(q.options), q.correct, q.xp);
    }
  }

  console.log('Demo-Quizzes und Arbeitsblätter angelegt.');
}

module.exports = { seedDemoData };
