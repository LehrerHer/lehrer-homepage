#!/bin/bash
# RESO API – Einmaliges Server-Setup
# Ausführen als root: bash setup.sh
set -e

echo "=== RESO API Setup ==="

# 1. Verzeichnis anlegen
mkdir -p /opt/reso
cp api.py /opt/reso/api.py

# 2. Python-Umgebung
python3 -m venv /opt/reso/venv
/opt/reso/venv/bin/pip install --upgrade pip -q
/opt/reso/venv/bin/pip install -r requirements.txt -q

# 3. Rechte
chown -R www-data:www-data /opt/reso

# 4. Systemd-Service
cp reso-api.service /etc/systemd/system/reso-api.service
echo ""
echo "WICHTIG: Token in /etc/systemd/system/reso-api.service setzen!"
echo "  Zeile:  Environment=\"RESO_TOKEN=HIER_SICHERES_TOKEN_EINTRAGEN\""
echo ""
read -rp "Token jetzt eingeben (Enter für 'changeme'): " TOKEN
TOKEN=${TOKEN:-changeme}
sed -i "s/HIER_SICHERES_TOKEN_EINTRAGEN/$TOKEN/" /etc/systemd/system/reso-api.service

systemctl daemon-reload
systemctl enable reso-api
systemctl start reso-api

echo ""
echo "5. Caddy konfigurieren – caddy-snippet.conf in den lehrer-herrmann.de-Block des Caddyfiles einfügen."
echo "   Typischer Pfad: /etc/caddy/Caddyfile"
echo "   Danach: caddy reload  (oder: systemctl reload caddy)"
echo ""
echo "=== Fertig! API läuft auf http://127.0.0.1:8400 ==="
echo "=== Test: curl http://127.0.0.1:8400/ ==="
echo "=== Test über Domain: curl https://lehrer-herrmann.de/reso-api/ ==="
