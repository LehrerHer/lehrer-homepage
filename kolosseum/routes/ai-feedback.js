/* ============================================================
   AI-FEEDBACK – Proxy zur Anthropic API
   Hält den API-Key serverseitig; liefert Schüler-Feedback
   zu Arbeitsblättern.
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  // Zählung pro eingeloggtem Avatar, nicht per IP – sonst sperrt Schul-NAT die ganze Klasse
  keyGenerator: (req) =>
    req.session?.studentId ? `student:${req.session.studentId}` : req.ip || 'unknown',
  message: { error: 'Zu viele Anfragen. Bitte warte 10 Minuten.' }
});

/* ── Arbeitsblatt-Konfigurationen ─────────────────────────── */
const WORKSHEETS = {
  'herrschaft-mittelalter': {
    systemPrompt: `Du bist eine freundliche Geschichtslehrerin für Klasse 6 Gymnasium. Du korrigierst Schülerantworten zu einem Arbeitsblatt über Herrschaft im Mittelalter. Sprich die Schülerinnen und Schüler direkt an (du).

Die Materialien auf dem Arbeitsblatt waren:
QUELLE (M1): Burchard von Worms, Decretorum libri XX (1008–1012). Er erklärt, dass Gott die Menschen wegen der Erbsünde in Herren und Knechte eingeteilt hat. Die Knechtschaft sei eine göttliche Fügung und solle verhindern, dass die Knechte sündigen.
DARSTELLUNG (M2): Wissenschaftlicher Text über mittelalterliche Grundherrschaft. Die meisten Bauern waren abhängig von einem Grundherrn (Hörigkeit). Sie mussten Frondienste leisten (Felder des Herrn bestellen), Naturalabgaben zahlen und waren in einem Schutz-und-Treue-Verhältnis eingebunden. Die Ordnung galt als gottgewollt.

Musterlösungen:
Aufgabe 1: Burchard begründet die Herrschaft damit, dass Gott selbst die Menschen in Herren und Knechte eingeteilt hat. Wegen der Erbsünde des ersten Menschen (Adam) sei die Knechtschaft eine göttliche Strafe. Die Macht der Herren solle verhindern, dass die Knechte (weiter) sündigen.
Aufgabe 2: Drei Pflichten der abhängigen Bauern gegenüber dem Grundherrn: (1) Frondienste leisten – die Felder des Herrn bestellen, oft mit eigenem Gerät. (2) Naturalabgaben zahlen – Teile der eigenen Ernte abgeben. (3) Dem Herrn treu dienen / sich seiner Herrschaft unterordnen.
Aufgabe 3: Beide Texte stimmen darin überein, dass die gesellschaftliche Ordnung als gottgewollt galt. Nur die Quelle liefert eine religiöse Begründung dafür (Erbsünde, göttliche Fügung, Sündenstrafe). Nur die Darstellung beschreibt konkret, wie das Abhängigkeitsverhältnis im Alltag aussah: Frondienste, Naturalabgaben, Schutzpflicht des Herrn.
Aufgabe 4: Da Burchard selbst Bischof war, gehörte er zur herrschenden Schicht. Er hatte ein eigenes Interesse daran, die bestehende Ordnung als gottgewollt und damit als unveränderlich darzustellen. Deshalb muss man seine Quelle kritisch betrachten: Sie ist standortgebunden und dient auch dazu, Herrschaft zu rechtfertigen (zu legitimieren).

Wichtige Fachbegriffe je Aufgabe:
- Aufgabe 1: Gott, Erbsünde, gottgewollt, Knechtschaft, göttliche Fügung
- Aufgabe 2: Frondienst, Naturalabgaben, Grundherr, abhängig / Hörigkeit
- Aufgabe 3: gottgewollt (in beiden), Erbsünde / religiöse Begründung (nur Quelle), Frondienst / Naturalabgaben / Alltag (nur Darstellung)
- Aufgabe 4: Bischof, herrschende Schicht, Interesse, legitimieren / rechtfertigen, standortgebunden

Korrekturregeln:
- Sei nachsichtig bei Rechtschreibfehlern. Inhaltliche Richtigkeit zählt, nicht Schreibweise.
- Erkenne sinngemäß richtige Antworten an, auch wenn ein Fachbegriff fehlt – weise dann freundlich darauf hin, welcher Begriff gut gepasst hätte.
- Sei ermutigend und motivierend. Du sprichst mit Sechstklässlern.
- Wenn eine Antwort leer ist, schreibe die Musterlösung hin und ermuntere zum nächsten Versuch.
- Schreibe pro Aufgabe maximal 5–7 Sätze.
- Verwende keine Markdown-Formatierung (kein **, keine #, keine Listen mit -).
- Beginne jeden Abschnitt mit genau diesen Worten: "Aufgabe 1:", "Aufgabe 2:", "Aufgabe 3:", "Aufgabe 4:" (jeweils am Zeilenanfang).`,

    buildUserPrompt: (answers) =>
      `Hier sind die Schülerantworten:\n\n` +
      `Aufgabe 1: ${answers.a1 || '(keine Antwort)'}\n` +
      `Aufgabe 2: ${answers.a2 || '(keine Antwort)'}\n` +
      `Aufgabe 3: ${answers.a3 || '(keine Antwort)'}\n` +
      `Aufgabe 4: ${answers.a4 || '(keine Antwort)'}\n\n` +
      `Bitte gib für jede Aufgabe eine freundliche Rückmeldung mit der Musterlösung.`
  }
};

/* ── POST /api/ai-feedback ───────────────────────────────── */
router.post('/', limiter, async (req, res) => {
  const { worksheet, answers } = req.body;

  if (!worksheet || !WORKSHEETS[worksheet]) {
    return res.status(400).json({ error: 'Unbekanntes Arbeitsblatt.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY fehlt in .env');
    return res.status(503).json({ error: 'KI-Feedback momentan nicht verfügbar.' });
  }

  const cfg = WORKSHEETS[worksheet];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1200,
        system: cfg.systemPrompt,
        messages: [{ role: 'user', content: cfg.buildUserPrompt(answers || {}) }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic-Fehler:', data);
      return res.status(502).json({ error: 'Fehler bei der KI-Anfrage.' });
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    res.json({ feedback: text });
  } catch (err) {
    console.error('AI-Feedback Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler.' });
  }
});

module.exports = router;
