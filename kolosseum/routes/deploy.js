/**
 * deploy.js – GitHub-Webhook-Endpunkt für automatisches Deployment.
 * POST /api/deploy  →  git pull + pm2 restart kolosseum
 *
 * Absicherung: GitHub schickt einen HMAC-SHA256-Signature-Header.
 * DEPLOY_SECRET muss in .env gesetzt sein und im GitHub-Webhook identisch.
 */
const express = require('express');
const crypto  = require('crypto');
const { exec } = require('child_process');

const router = express.Router();

const DEPLOY_DIR    = process.env.DEPLOY_DIR    || '/var/www/lehrer-homepage';
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || '';
const PM2_APP       = process.env.PM2_APP       || 'kolosseum';

function verifySignature(req) {
  if (!DEPLOY_SECRET) return false;
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', DEPLOY_SECRET)
    .update(req.body)          // req.body ist der rohe Buffer (siehe server.js)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  if (!verifySignature(req)) {
    console.warn('[deploy] Ungültige Signatur – Anfrage abgelehnt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try { payload = JSON.parse(req.body.toString()); } catch { payload = {}; }

  // Nur bei Pushes auf main deployen
  if (payload.ref && payload.ref !== 'refs/heads/main') {
    return res.json({ skipped: true, ref: payload.ref });
  }

  console.log('[deploy] Push auf main erkannt – starte Deployment …');
  res.json({ ok: true, message: 'Deployment gestartet' });

  const cmd = `cd ${DEPLOY_DIR} && git fetch origin && git reset --hard origin/main && pm2 restart ${PM2_APP}`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('[deploy] Fehler:', stderr || err.message);
    } else {
      console.log('[deploy] Erfolgreich:\n', stdout);
    }
  });
});

module.exports = router;
