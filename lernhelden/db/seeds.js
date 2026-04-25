const { pool } = require('./database');

async function seedDemoData() {
  const { rows } = await pool.query('SELECT COUNT(*) as n FROM quizzes');
  if (parseInt(rows[0].n) > 0) return;

  async function addQuiz(title, subject, type, description, questions) {
    const r = await pool.query(
      'INSERT INTO quizzes (title, subject, type, description) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, subject, type, description || null]
    );
    const quizId = r.rows[0].id;
    for (const q of questions) {
      await pool.query(
        'INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES ($1, $2, $3, $4, $5)',
        [quizId, q.text, JSON.stringify(q.options), q.correct, q.xp]
      );
    }
  }

  // ── Demo-Quizzes ─────────────────────────────────────────────────
  await addQuiz('Mathematik: Grundrechenarten', 'Mathematik', 'quiz',
    'Teste dein Rechnen – Multiplikation, Division, Prozente und Primzahlen.', [
    { text: 'Was ist 7 × 8?', options: ['54', '56', '63', '48'], correct: 1, xp: 10 },
    { text: 'Was ergibt 144 ÷ 12?', options: ['10', '11', '12', '13'], correct: 2, xp: 10 },
    { text: 'Was ist 25% von 200?', options: ['25', '40', '50', '75'], correct: 2, xp: 15 },
    { text: 'Welche Zahl ist eine Primzahl?', options: ['15', '21', '37', '49'], correct: 2, xp: 15 },
    { text: 'Was ist die Wurzel aus 169?', options: ['11', '12', '13', '14'], correct: 2, xp: 20 },
  ]);

  await addQuiz('Deutsch: Grammatik', 'Deutsch', 'quiz',
    'Adjektive, Pluralformen, Zeitformen und Satztypen.', [
    { text: 'Welches Wort ist ein Adjektiv?', options: ['laufen', 'schön', 'Haus', 'schnell rennen'], correct: 1, xp: 10 },
    { text: 'Was ist der Plural von „das Kind"?', options: ['die Kinden', 'die Kinder', 'die Kinds', 'die Kindes'], correct: 1, xp: 10 },
    { text: 'In welchem Satz steht ein Relativsatz?', options: ['Er schläft tief.', 'Das Buch, das ich lese, ist spannend.', 'Sie isst gerne Äpfel.', 'Wir gehen schwimmen.'], correct: 1, xp: 20 },
    { text: 'Welche Zeitform ist „Sie hatte geschlafen"?', options: ['Präsens', 'Präteritum', 'Plusquamperfekt', 'Futur I'], correct: 2, xp: 15 },
    { text: 'Was ist ein Synonym für „glücklich"?', options: ['traurig', 'froh', 'wütend', 'müde'], correct: 1, xp: 10 },
  ]);

  await addQuiz('Englisch: Basics', 'Englisch', 'quiz',
    'Vergangenheitsformen, Vokabeln und Grammatik auf Englisch.', [
    { text: 'What is the past tense of "go"?', options: ['goed', 'gone', 'went', 'going'], correct: 2, xp: 10 },
    { text: 'Which word means "Fahrrad"?', options: ['car', 'bus', 'bicycle', 'train'], correct: 2, xp: 10 },
    { text: 'Complete: "She ___ to school every day."', options: ['go', 'goes', 'going', 'gone'], correct: 1, xp: 15 },
    { text: 'What does "enormous" mean?', options: ['tiny', 'fast', 'huge', 'quiet'], correct: 2, xp: 15 },
    { text: 'Which sentence is correct?', options: ['I am go home.', 'I going home.', 'I am going home.', 'I goes home.'], correct: 2, xp: 20 },
  ]);

  // ── Migrierte Standalone-Quizze ────────────────────────────────
  await addQuiz('Stilmittel', 'Deutsch', 'quiz',
    'Erkenne und benenne rhetorische und stilistische Mittel.', [
    { text: 'Welches Stilmittel liegt vor? „Er kämpft wie ein Löwe."', options: ['Metapher', 'Vergleich', 'Personifikation', 'Hyperbel'], correct: 1, xp: 15 },
    { text: 'Was beschreibt eine Metapher?', options: ['Verknüpfung durch „wie" oder „als"', 'Bildlicher Ausdruck ohne Vergleichswort', 'Menschliche Eigenschaften auf Dinge übertragen', 'Bewusste Übertreibung'], correct: 1, xp: 15 },
    { text: 'Welches Stilmittel liegt vor? „Die Sonne lacht."', options: ['Vergleich', 'Metapher', 'Personifikation', 'Hyperbel'], correct: 2, xp: 15 },
    { text: 'Was ist eine Alliteration?', options: ['Wiederholung am Satzende', 'Gleiche Anfangslaute aufeinanderfolgender Wörter', 'Steigerung zum Schluss', 'Umkehrung der Wortstellung'], correct: 1, xp: 15 },
    { text: 'Welches Stilmittel liegt vor? „Ich habe das tausendmal gesagt!"', options: ['Litotes', 'Anapher', 'Hyperbel', 'Ironie'], correct: 2, xp: 15 },
    { text: 'Was ist eine Anapher?', options: ['Wiederholung am Satzende', 'Gleichartig gebaute Sätze', 'Wiederholung eines Wortes am Beginn aufeinanderfolgender Verse/Sätze', 'Auslassung von Wörtern'], correct: 2, xp: 15 },
    { text: 'Welches Stilmittel liegt vor? „Nicht schlecht!" (wenn etwas sehr gut gemeint ist)', options: ['Antithese', 'Parallelismus', 'Ironie', 'Paradoxon'], correct: 2, xp: 20 },
    { text: 'Was ist ein Parallelismus?', options: ['Übertreibung zur Betonung', 'Gleichartig aufgebaute Sätze oder Satzteile', 'Wiederholung am Versende', 'Bild ohne Vergleichswort'], correct: 1, xp: 20 },
  ]);

  await addQuiz('Literaturwissenschaft', 'Deutsch', 'quiz',
    'Grundbegriffe der Literaturwissenschaft: Gattungen, Erzähltheorie und Dramenanalyse.', [
    { text: 'Welche drei Großgattungen der Literatur unterscheidet die Literaturwissenschaft?', options: ['Epik, Lyrik und Dramatik', 'Roman, Gedicht und Theater', 'Prosa, Vers und Dialog', 'Erzählung, Lyrik und Film'], correct: 0, xp: 10 },
    { text: 'Was kann laut Literaturwissenschaft als Teil der Epik betrachtet werden?', options: ['Nur traditionelle Romane', 'Filme und Computerspiele mit einem Plot', 'Nur mündliche Überlieferungen', 'Ausschließlich Lyrik'], correct: 1, xp: 10 },
    { text: 'Wer entspricht im erzählenden Computerspiel dem Erzähler eines Romans?', options: ['Der Regisseur', 'Der Game Writer / die Game Writerin', 'Der Publisher', 'Der Cutter'], correct: 1, xp: 15 },
    { text: 'Was ist der Unterschied zwischen Autor und Erzähler?', options: ['Es gibt keinen Unterschied', 'Der Autor ist die reale Person, der Erzähler eine Figur im Text', 'Der Erzähler schreibt den Text, der Autor liest ihn', 'Der Autor erzählt immer in der Ich-Perspektive'], correct: 1, xp: 15 },
    { text: 'Was versteht man unter einem homodiegetischen Erzähler?', options: ['Erzähler außerhalb der Geschichte', 'Erzähler, der Teil der erzählten Welt ist (Ich-Erzähler)', 'Erzähler, der alles weiß', 'Erzähler ohne Stimme'], correct: 1, xp: 20 },
    { text: 'Was bedeutet „Zeitraffung" in einem Erzähltext?', options: ['Die Zeit steht still im Text', 'Ein langer Zeitraum wird in wenigen Sätzen erzählt', 'Die Geschichte wird rückwärts erzählt', 'Der Text enthält keine Zeitangaben'], correct: 1, xp: 15 },
    { text: 'Was ist „erlebte Rede"?', options: ['Direkte wörtliche Rede in Anführungszeichen', 'Indirekte Rede im Konjunktiv', 'Gedanken einer Figur in der 3. Person Singular, Präteritum', 'Ein innerer Monolog des Erzählers'], correct: 2, xp: 20 },
    { text: 'Welche Struktur beschreibt Freytags Dramenpyramide?', options: ['Einleitung, Hauptteil, Schluss', 'Exposition, steigende Handlung, Höhepunkt, fallende Handlung, Katastrophe', 'These, Antithese, Synthese', 'Prolog, Akte, Epilog'], correct: 1, xp: 20 },
  ]);

  await addQuiz('Rechtschreibung', 'Deutsch', 'quiz',
    'Groß-/Kleinschreibung, Satzzeichen und s-Laute.', [
    { text: 'Welche Schreibung ist richtig? „Das ___ bellt laut."', options: ['hund', 'Hund', 'HUND', 'hunD'], correct: 1, xp: 10 },
    { text: 'Welche Schreibung ist richtig? „Meine ___ heißt Lisa."', options: ['schwester', 'Schwester', 'SCHWESTER', 'Schwesster'], correct: 1, xp: 10 },
    { text: 'Welches Wort muss kleingeschrieben werden? „Er läuft ___ als sein Bruder."', options: ['Schneller', 'schneller', 'Schneler', 'SCHNELLER'], correct: 1, xp: 10 },
    { text: 'Welches Satzzeichen gehört ans Ende? „Wie heißt du ___"', options: ['.', ',', '?', '!'], correct: 2, xp: 10 },
    { text: 'Welches Satzzeichen fehlt? „Ich gehe jetzt nach Hause ___"', options: ['?', '!', '.', ','], correct: 2, xp: 10 },
    { text: 'Welche Schreibung ist richtig? „Der Hund bei___t nicht."', options: ['beist', 'beißt', 'beisst', 'beißßt'], correct: 1, xp: 15 },
    { text: 'Welche Schreibung ist richtig? „Die Stra___e ist lang."', options: ['Straße', 'Strasse', 'Strase', 'Straase'], correct: 0, xp: 15 },
    { text: 'Welche Wortart ist das Wort „laufen"?', options: ['Nomen', 'Verb', 'Adjektiv', 'Artikel'], correct: 1, xp: 10 },
    { text: 'Welche Wortart ist das Wort „klein"?', options: ['Nomen', 'Verb', 'Adjektiv', 'Konjunktion'], correct: 2, xp: 10 },
    { text: 'Welche Wortart ist „weil"?', options: ['Adjektiv', 'Nomen', 'Konjunktion', 'Pronomen'], correct: 2, xp: 15 },
  ]);

  // ── Digitale Arbeitsblätter ────────────────────────────────────
  await addQuiz('Deutsch: Kurztext analysieren', 'Deutsch', 'arbeitsblatt',
    'Lies den Kurztext und beantworte die Fragen zur Textanalyse. Thema: Aufbau und Inhalt eines Erzähltextes.', [
    { text: 'Ein Erzähltext beginnt typischerweise mit …', options: ['dem Höhepunkt der Handlung', 'einer Exposition, die Figuren und Situation vorstellt', 'dem Ende der Geschichte', 'einem Zitat des Autors'], correct: 1, xp: 10 },
    { text: 'Was versteht man unter dem Begriff „Erzählperspektive"?', options: ['Den Stil des Schreibens (z.B. Metaphern)', 'Den zeitlichen Ablauf der Geschichte', 'Den Standpunkt, von dem aus eine Geschichte erzählt wird', 'Die geografische Lage des Handlungsortes'], correct: 2, xp: 10 },
    { text: 'Welche Erzählperspektive verwendet der Satz: „Ich sah den Mann einbiegen"?', options: ['Er-/Sie-Perspektive (auktorial)', 'Ich-Perspektive', 'Wir-Perspektive', 'Du-Perspektive'], correct: 1, xp: 10 },
    { text: 'Was ist ein „Stilmittel"?', options: ['Eine Schreibweise, die für besondere Wirkung im Text sorgt', 'Die Handlung im Mittelpunkt des Textes', 'Ein Fehler im Text', 'Die Länge eines Textes'], correct: 0, xp: 15 },
    { text: 'Der „Höhepunkt" einer Erzählung …', options: ['… ist immer am Anfang zu finden', '… beschreibt den Ort der Handlung', '… ist der spannendste Moment, an dem sich das Schicksal der Figuren entscheidet', '… erklärt die Vorgeschichte'], correct: 2, xp: 15 },
  ]);

  await addQuiz('Mathematik: Textaufgaben', 'Mathematik', 'arbeitsblatt',
    'Lies jede Aufgabe genau und rechne Schritt für Schritt. Tipps: Gegeben, Gesucht, Rechnung, Antwort.', [
    { text: 'Lena kauft 4 Hefte à 2,50 € und einen Stift für 1,20 €. Wie viel zahlt sie insgesamt?', options: ['10,00 €', '11,20 €', '9,80 €', '12,50 €'], correct: 1, xp: 15 },
    { text: 'Ein Zug fährt mit 120 km/h. Wie weit kommt er in 2,5 Stunden?', options: ['240 km', '300 km', '280 km', '350 km'], correct: 1, xp: 15 },
    { text: 'In einer Klasse sind 30 Schüler. 40% nehmen am Sportfest teil. Wie viele Schüler sind das?', options: ['10', '12', '14', '15'], correct: 1, xp: 15 },
    { text: 'Ein Rechteck hat die Länge 8 cm und die Breite 5 cm. Wie groß ist der Flächeninhalt?', options: ['26 cm²', '40 cm²', '35 cm²', '13 cm²'], correct: 1, xp: 10 },
    { text: 'Tim spart jeden Monat 25 €. Nach wie vielen Monaten hat er 300 € gespart?', options: ['10', '12', '8', '15'], correct: 1, xp: 10 },
  ]);

  await addQuiz('Englisch: Reading Comprehension', 'Englisch', 'arbeitsblatt',
    'Read the text carefully and answer the questions. Take your time – reading comprehension needs attention to detail!', [
    { text: 'What does "comprehension" mean in the context of reading?', options: ['Writing a story', 'Understanding what you read', 'Translating a text', 'Memorising words'], correct: 1, xp: 10 },
    { text: 'Which strategy helps you understand an unknown word?', options: ['Skip it and move on', 'Look at the context of the sentence', 'Always use a dictionary first', 'Guess randomly'], correct: 1, xp: 10 },
    { text: 'What is a "main idea" in a text?', options: ['A small detail from the middle of the text', 'The most important point the author wants to make', 'The first sentence of every paragraph', 'A question the reader asks'], correct: 1, xp: 15 },
    { text: 'What does a topic sentence usually do?', options: ['It ends the paragraph', 'It introduces the main idea of a paragraph', 'It gives examples', 'It is always a question'], correct: 1, xp: 15 },
    { text: 'If an author writes "It was as cold as ice," this is an example of …', options: ['a metaphor', 'a simile', 'an alliteration', 'a hyperbole'], correct: 1, xp: 15 },
  ]);

  console.log('✅ Demo-Daten angelegt (6 Quizze, 3 Arbeitsblätter).');
}

module.exports = { seedDemoData };
