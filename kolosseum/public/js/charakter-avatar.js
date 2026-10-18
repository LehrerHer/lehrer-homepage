/* ============================================================
   Charakter-Avatar (SVG) – EINZIGE Zeichenfunktion für
   Charakter, Profil, Rangliste und Kampf.
   window.drawCharakterAvatar(cfg, size) → SVG-String
   cfg: { classId, raceId, genderId, skinId, hairColorId, accessoryId }

   Erkennbarkeit auf einen Blick:
   - Klasse: Kleidung, Waffe/Attribut, Kopfbedeckung
     Ritter (Rüstung, Schwert, Schild) · Magier (Robe, Spitzhut, Stab)
     Waldschrat (Kapuze, Blätterkranz, Knorrenstab) · Bogenschütze
     (Lederwams, Federhut, Bogen, Köcher) · Lehrer (Jackett, Krawatte,
     Doktorhut, Buch, Zeigestock)
   - Volk: Körperform, Kopf, Ohren, Bart, Gesicht
     Mensch (ausgewogen) · Zwerg (breit, gedrungen, Bart/Zöpfe, große Nase)
     Elfe (schlank, lange Spitzohren, Mandelaugen, Stirnreif)
   ============================================================ */
(function () {
  'use strict';

  const SKIN_TONES = {
    s1: '#fde8c8', s2: '#f0c898', s3: '#d4a070', s4: '#9a6038', s5: '#6a3818',
  };
  const HAIR_COLORS = {
    hc1: '#2a1a0e', hc2: '#6b3a1f', hc3: '#d4a53a', hc4: '#9b3a1a',
    hc5: '#908880', hc6: '#e8e0d0', hc7: '#8040d0', hc8: '#3a6030',
  };

  // Farbwelt je Klasse (Kleidung)
  const KLASSEN = {
    knight:  { stoff: '#a8323a', stoffDunkel: '#6e1c22', glow: '#c8a04088' },
    mage:    { stoff: '#5b3fa8', stoffDunkel: '#36246e', glow: '#8060d088' },
    druid:   { stoff: '#3f7a3a', stoffDunkel: '#24501f', glow: '#60a05088' },
    archer:  { stoff: '#7a4a24', stoffDunkel: '#4a2a10', glow: '#a0704088' },
    teacher: { stoff: '#2f5f86', stoffDunkel: '#1a3d5c', glow: '#4080a088' },
  };

  // Körperbau je Volk
  const VOELKER = {
    human: { hy: 36, hrx: 14,   hry: 16,   tw: 34, ty: 58, hals: 8 },
    dwarf: { hy: 43, hrx: 16.5, hry: 14.5, tw: 48, ty: 63, hals: 11 },
    elf:   { hy: 33, hrx: 12.5, hry: 17.5, tw: 27, ty: 56, hals: 6 },
  };

  let zaehler = 0;

  function drawCharakterAvatar(cfg, size) {
    cfg = cfg || {};
    size = size || 140;
    const uid    = 'av' + (++zaehler) + Math.random().toString(36).slice(2, 6);
    const klasse = KLASSEN[cfg.classId] ? cfg.classId : 'knight';
    const volk   = VOELKER[cfg.raceId] ? cfg.raceId : 'human';
    const gender = ['male', 'female', 'diverse'].includes(cfg.genderId) ? cfg.genderId : 'male';
    const acc    = cfg.accessoryId || 'none';
    const haut   = SKIN_TONES[cfg.skinId] || SKIN_TONES.s2;
    const haar   = HAIR_COLORS[cfg.hairColorId] || HAIR_COLORS.hc2;
    const K = KLASSEN[klasse];
    const V = VOELKER[volk];

    const hx = 50, hy = V.hy, rx = V.hrx, ry = V.hry;
    const sL = 50 - V.tw / 2, sR = 50 + V.tw / 2, ty = V.ty;
    const hellHaut = ['s1', 's2'].includes(cfg.skinId) || !cfg.skinId;
    const kontur   = hellHaut ? '#a0704a' : '#3a1a08';
    const lippe    = hellHaut ? '#b0584a' : '#5a1e12';
    const handL = { x: sL - 4, y: ty + 29 };
    const handR = { x: sR + 4, y: ty + 29 };

    const teile = [];
    const add = (s) => teile.push(s);

    // ── Hintergrund-Aura ──────────────────────────────────────────
    add(`<defs>
      <radialGradient id="${uid}-aura" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stop-color="${K.stoff}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${K.stoff}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${uid}-stahl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e4e9ee"/><stop offset="55%" stop-color="#9aa3ad"/><stop offset="100%" stop-color="#5f6872"/>
      </linearGradient>
      <radialGradient id="${uid}-kugel" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="45%" stop-color="#b7a0ff"/><stop offset="100%" stop-color="#5b3fa8"/>
      </radialGradient>
    </defs>`);
    add(`<circle cx="50" cy="54" r="46" fill="url(#${uid}-aura)"/>`);

    // ── Hinter dem Körper: Köcher, Kapuze, lange Haare ─────────────
    if (klasse === 'archer') {
      add(`<g transform="rotate(18 ${sR - 4} ${ty})">
        <rect x="${sR - 9}" y="${ty - 18}" width="9" height="30" rx="3" fill="#5a3416" stroke="#2e1a08" stroke-width="1"/>
        ${[0, 3, 6].map(d => `<line x1="${sR - 7 + d}" y1="${ty - 18}" x2="${sR - 7 + d}" y2="${ty - 26}" stroke="#d8c8a0" stroke-width="1"/>
          <path d="M${sR - 8.5 + d},${ty - 26} l1.5,-4 l1.5,4 z" fill="#c0392b"/>`).join('')}
      </g>`);
    }
    if (klasse === 'druid') {
      add(`<path d="M${hx - rx - 7},${hy + ry + 8} Q${hx - rx - 9},${hy - ry - 4} ${hx},${hy - ry - 8}
        Q${hx + rx + 9},${hy - ry - 4} ${hx + rx + 7},${hy + ry + 8} Z" fill="${K.stoffDunkel}"/>`);
    }
    if (gender === 'female' && volk !== 'dwarf') {
      add(`<path d="M${hx - rx - 2},${hy - 4} Q${hx - rx - 5},${hy + ry + 10} ${hx - rx + 1},${hy + ry + 15}
        L${hx + rx - 1},${hy + ry + 15} Q${hx + rx + 5},${hy + ry + 10} ${hx + rx + 2},${hy - 4} Z" fill="${haar}"/>`);
    }

    // ── Körper: Kleidung je Klasse ────────────────────────────────
    const rumpf = `M${sL},${ty + 6} Q${sL},${ty} ${sL + 6},${ty} L${sR - 6},${ty} Q${sR},${ty} ${sR},${ty + 6}`;
    const armL = `<rect x="${sL - 8}" y="${ty + 2}" width="9" height="27" rx="4.5"`;
    const armR = `<rect x="${sR - 1}" y="${ty + 2}" width="9" height="27" rx="4.5"`;

    if (klasse === 'knight') {
      add(`${armL} fill="url(#${uid}-stahl)" stroke="#4a525a" stroke-width="0.8"/>`);
      add(`${armR} fill="url(#${uid}-stahl)" stroke="#4a525a" stroke-width="0.8"/>`);
      add(`<path d="${rumpf} L${sR + 1},100 L${sL - 1},100 Z" fill="url(#${uid}-stahl)" stroke="#4a525a" stroke-width="0.8"/>`);
      // Wappenrock mit Kreuz
      add(`<path d="M${50 - V.tw * 0.28},${ty + 8} L${50 + V.tw * 0.28},${ty + 8} L${50 + V.tw * 0.32},100 L${50 - V.tw * 0.32},100 Z" fill="${K.stoff}"/>`);
      add(`<path d="M50,${ty + 14} V${ty + 34} M${50 - 6},${ty + 21} H${50 + 6}" stroke="#f2cf6b" stroke-width="2.6" stroke-linecap="round"/>`);
      // Schulterplatten
      add(`<ellipse cx="${sL + 2}" cy="${ty + 3}" rx="8" ry="5" fill="url(#${uid}-stahl)" stroke="#4a525a" stroke-width="0.8"/>`);
      add(`<ellipse cx="${sR - 2}" cy="${ty + 3}" rx="8" ry="5" fill="url(#${uid}-stahl)" stroke="#4a525a" stroke-width="0.8"/>`);
    } else if (klasse === 'mage' || klasse === 'druid') {
      add(`${armL} fill="${K.stoff}"/>`);
      add(`${armR} fill="${K.stoff}"/>`);
      // Weite Ärmel
      add(`<path d="M${sL - 9},${ty + 22} L${sL + 2},${ty + 22} L${sL + 3},${ty + 31} L${sL - 12},${ty + 31} Z" fill="${K.stoffDunkel}"/>`);
      add(`<path d="M${sR - 2},${ty + 22} L${sR + 9},${ty + 22} L${sR + 12},${ty + 31} L${sR - 3},${ty + 31} Z" fill="${K.stoffDunkel}"/>`);
      add(`<path d="${rumpf} L${sR + 6},100 L${sL - 6},100 Z" fill="${K.stoff}"/>`);
      if (klasse === 'mage') {
        add(`<path d="M50,${ty} V100" stroke="#f2cf6b" stroke-width="1.6"/>`);
        add(`<rect x="${sL + 1}" y="${ty + 18}" width="${V.tw - 2}" height="3.5" fill="#f2cf6b"/>`);
        add(stern(sL + 6, ty + 30, 2.6, '#f2cf6b') + stern(sR - 7, ty + 36, 2, '#f2cf6b') + stern(sL + 9, ty + 39, 1.6, '#e8e0ff'));
      } else {
        // Blätter am Umhang und Gürtel
        add(`<path d="M${sL + 1},${ty + 18} H${sR - 1}" stroke="#6b4a20" stroke-width="3"/>`);
        add(blatt(sL + 4, ty + 6, -30, '#7fbf5a') + blatt(sR - 4, ty + 6, 30, '#7fbf5a') + blatt(50, ty + 28, 0, '#9fd46c'));
      }
    } else if (klasse === 'archer') {
      add(`${armL} fill="#3f6b2e"/>`);
      add(`${armR} fill="#3f6b2e"/>`);
      add(`<path d="${rumpf} L${sR + 1},100 L${sL - 1},100 Z" fill="${K.stoff}" stroke="${K.stoffDunkel}" stroke-width="0.8"/>`);
      // Schnürung + Köcherriemen
      add(`<path d="M${50 - 3},${ty + 6} L${50 + 3},${ty + 11} M${50 + 3},${ty + 6} L${50 - 3},${ty + 11} M${50 - 3},${ty + 13} L${50 + 3},${ty + 18} M${50 + 3},${ty + 13} L${50 - 3},${ty + 18}" stroke="#e0c690" stroke-width="1"/>`);
      add(`<path d="M${sL + 3},${ty + 1} L${sR - 2},${ty + 30}" stroke="#3a200c" stroke-width="3"/>`);
      add(`<path d="M${sL - 1},${ty + 24} H${sR + 1}" stroke="#3a200c" stroke-width="3"/>`);
    } else { // teacher
      add(`${armL} fill="${K.stoff}"/>`);
      add(`${armR} fill="${K.stoff}"/>`);
      add(`<path d="${rumpf} L${sR + 1},100 L${sL - 1},100 Z" fill="${K.stoff}" stroke="${K.stoffDunkel}" stroke-width="0.8"/>`);
      // Hemd, Revers, Krawatte
      add(`<path d="M${50 - 7},${ty} L50,${ty + 16} L${50 + 7},${ty} Z" fill="#f4f1e8"/>`);
      add(`<path d="M${50 - 7},${ty} L${50 - 2},${ty + 20} L${50 - 9},${ty + 10} Z M${50 + 7},${ty} L${50 + 2},${ty + 20} L${50 + 9},${ty + 10} Z" fill="${K.stoffDunkel}"/>`);
      add(`<path d="M50,${ty + 2} l-2,3 l2,13 l2,-13 z" fill="#c0392b"/>`);
      add(`<rect x="${sR - 9}" y="${ty + 8}" width="5" height="1.6" fill="#f2cf6b"/>`);
    }

    // Hände
    add(`<circle cx="${handL.x}" cy="${handL.y}" r="4.2" fill="${haut}" stroke="${kontur}" stroke-width="0.5"/>`);
    add(`<circle cx="${handR.x}" cy="${handR.y}" r="4.2" fill="${haut}" stroke="${kontur}" stroke-width="0.5"/>`);

    // ── Waffen & Attribute (vor dem Körper) ───────────────────────
    if (klasse === 'knight') {
      // Schwert rechts
      add(`<g>
        <path d="M${handR.x - 2},${handR.y - 5} L${handR.x - 2},${handR.y - 46} L${handR.x},${handR.y - 51} L${handR.x + 2},${handR.y - 46} L${handR.x + 2},${handR.y - 5} Z" fill="url(#${uid}-stahl)" stroke="#4a525a" stroke-width="0.6"/>
        <rect x="${handR.x - 7}" y="${handR.y - 6}" width="14" height="3" rx="1.2" fill="#c9962f"/>
        <rect x="${handR.x - 1.5}" y="${handR.y - 3}" width="3" height="8" fill="#5a3416"/>
        <circle cx="${handR.x}" cy="${handR.y + 6}" r="2" fill="#c9962f"/>
      </g>`);
      // Schild links
      const sx = handL.x + 2, sy = handL.y - 14;
      add(`<g>
        <path d="M${sx - 10},${sy} H${sx + 10} V${sy + 13} Q${sx + 10},${sy + 22} ${sx},${sy + 27} Q${sx - 10},${sy + 22} ${sx - 10},${sy + 13} Z" fill="${K.stoff}" stroke="#c9962f" stroke-width="1.8"/>
        <path d="M${sx},${sy + 3} V${sy + 23} M${sx - 6},${sy + 10} H${sx + 6}" stroke="#f2cf6b" stroke-width="2.4" stroke-linecap="round"/>
      </g>`);
    } else if (klasse === 'mage') {
      add(`<line x1="${handR.x}" y1="99" x2="${handR.x}" y2="${handR.y - 48}" stroke="#6b4a20" stroke-width="2.6" stroke-linecap="round"/>`);
      add(`<path d="M${handR.x - 4},${handR.y - 47} Q${handR.x},${handR.y - 42} ${handR.x + 4},${handR.y - 47}" stroke="#c9962f" stroke-width="1.6" fill="none"/>`);
      add(`<circle cx="${handR.x}" cy="${handR.y - 52}" r="5.5" fill="url(#${uid}-kugel)"/>`);
      add(`<circle cx="${handR.x}" cy="${handR.y - 52}" r="8.5" fill="#b7a0ff" opacity="0.25"/>`);
    } else if (klasse === 'druid') {
      add(`<path d="M${handR.x},99 Q${handR.x - 3},${handR.y - 12} ${handR.x + 1},${handR.y - 28} Q${handR.x + 4},${handR.y - 40} ${handR.x - 2},${handR.y - 48}" stroke="#6b4a20" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      add(`<path d="M${handR.x + 1},${handR.y - 28} q5,-3 7,-9" stroke="#6b4a20" stroke-width="2" fill="none" stroke-linecap="round"/>`);
      add(blatt(handR.x - 3, handR.y - 50, -20, '#7fbf5a') + blatt(handR.x + 3, handR.y - 47, 40, '#9fd46c') + blatt(handR.x + 8, handR.y - 38, 70, '#7fbf5a'));
    } else if (klasse === 'archer') {
      const bx = handL.x - 2;
      add(`<path d="M${bx + 4},${handL.y - 34} Q${bx - 20},${handL.y} ${bx + 4},${handL.y + 30}" stroke="#8a5420" stroke-width="3.4" fill="none" stroke-linecap="round"/>`);
      add(`<line x1="${bx + 4}" y1="${handL.y - 34}" x2="${bx + 4}" y2="${handL.y + 30}" stroke="#e8dcc0" stroke-width="0.9"/>`);
      add(`<circle cx="${handL.x}" cy="${handL.y}" r="4.2" fill="${haut}" stroke="${kontur}" stroke-width="0.5"/>`);
    } else { // teacher
      // Buch links
      add(`<g transform="rotate(-12 ${handL.x} ${handL.y})">
        <rect x="${handL.x - 7}" y="${handL.y - 13}" width="14" height="18" rx="1.5" fill="#8a2f2a" stroke="#4a1410" stroke-width="0.8"/>
        <rect x="${handL.x - 7}" y="${handL.y - 13}" width="2.5" height="18" fill="#4a1410"/>
        <rect x="${handL.x - 2}" y="${handL.y - 9}" width="7" height="1.4" fill="#f2cf6b"/>
      </g>`);
      add(`<circle cx="${handL.x}" cy="${handL.y}" r="4.2" fill="${haut}" stroke="${kontur}" stroke-width="0.5"/>`);
      // Zeigestock rechts
      add(`<line x1="${handR.x}" y1="${handR.y}" x2="${handR.x + 10}" y2="${handR.y - 40}" stroke="#c8a060" stroke-width="2" stroke-linecap="round"/>`);
      add(`<circle cx="${handR.x + 10}" cy="${handR.y - 40}" r="1.6" fill="#f4f1e8"/>`);
    }

    // ── Hals, Ohren, Kopf ─────────────────────────────────────────
    add(`<rect x="${hx - V.hals / 2}" y="${hy + ry - 4}" width="${V.hals}" height="${ty - hy - ry + 6}" fill="${haut}"/>`);
    if (volk === 'elf') {
      add(`<path d="M${hx - rx + 1.5},${hy - 1} L${hx - rx - 13},${hy - 15} L${hx - rx + 1},${hy + 6} Z" fill="${haut}" stroke="${kontur}" stroke-width="0.7" stroke-linejoin="round"/>`);
      add(`<path d="M${hx + rx - 1.5},${hy - 1} L${hx + rx + 13},${hy - 15} L${hx + rx - 1},${hy + 6} Z" fill="${haut}" stroke="${kontur}" stroke-width="0.7" stroke-linejoin="round"/>`);
    } else {
      const or = volk === 'dwarf' ? 4.2 : 3.4;
      add(`<ellipse cx="${hx - rx}" cy="${hy + 1}" rx="${or * 0.8}" ry="${or}" fill="${haut}" stroke="${kontur}" stroke-width="0.6"/>`);
      add(`<ellipse cx="${hx + rx}" cy="${hy + 1}" rx="${or * 0.8}" ry="${or}" fill="${haut}" stroke="${kontur}" stroke-width="0.6"/>`);
    }
    add(`<ellipse cx="${hx}" cy="${hy}" rx="${rx}" ry="${ry}" fill="${haut}" stroke="${kontur}" stroke-width="0.6"/>`);

    // ── Gesicht ───────────────────────────────────────────────────
    const ax = rx * 0.42, ay = hy - 1;
    if (volk === 'elf') {
      add(`<path d="M${hx - ax - 3.5},${ay + 0.8} Q${hx - ax},${ay - 3} ${hx - ax + 3.5},${ay - 1.2} Q${hx - ax},${ay + 2.2} ${hx - ax - 3.5},${ay + 0.8} Z" fill="#fff"/>`);
      add(`<path d="M${hx + ax + 3.5},${ay + 0.8} Q${hx + ax},${ay - 3} ${hx + ax - 3.5},${ay - 1.2} Q${hx + ax},${ay + 2.2} ${hx + ax + 3.5},${ay + 0.8} Z" fill="#fff"/>`);
      add(`<circle cx="${hx - ax}" cy="${ay}" r="1.5" fill="#2a5a3a"/><circle cx="${hx + ax}" cy="${ay}" r="1.5" fill="#2a5a3a"/>`);
    } else {
      add(`<ellipse cx="${hx - ax}" cy="${ay}" rx="2.8" ry="3.1" fill="#fff"/><ellipse cx="${hx + ax}" cy="${ay}" rx="2.8" ry="3.1" fill="#fff"/>`);
      add(`<circle cx="${hx - ax + 0.4}" cy="${ay + 0.4}" r="1.7" fill="#1e1208"/><circle cx="${hx + ax + 0.4}" cy="${ay + 0.4}" r="1.7" fill="#1e1208"/>`);
      add(`<circle cx="${hx - ax + 1}" cy="${ay - 0.5}" r="0.6" fill="#fff"/><circle cx="${hx + ax + 1}" cy="${ay - 0.5}" r="0.6" fill="#fff"/>`);
    }
    if (gender === 'female') {
      add(`<path d="M${hx - ax - 3},${ay - 2.4} l-1.6,-1.4 M${hx + ax + 3},${ay - 2.4} l1.6,-1.4" stroke="#1e1208" stroke-width="0.8" stroke-linecap="round"/>`);
    }
    // Augenbrauen (Zwerge: buschig)
    const bw = volk === 'dwarf' ? 2.4 : 1.1;
    add(`<path d="M${hx - ax - 3.4},${ay - 4.2} Q${hx - ax},${ay - 5.6 - (volk === 'elf' ? 1 : 0)} ${hx - ax + 3.2},${ay - 4.4}" stroke="${haar}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`);
    add(`<path d="M${hx + ax + 3.4},${ay - 4.2} Q${hx + ax},${ay - 5.6 - (volk === 'elf' ? 1 : 0)} ${hx + ax - 3.2},${ay - 4.4}" stroke="${haar}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`);
    // Nase
    if (volk === 'dwarf') {
      add(`<ellipse cx="${hx}" cy="${hy + 4.5}" rx="3.6" ry="3" fill="${haut}" stroke="${kontur}" stroke-width="0.7"/>`);
      add(`<circle cx="${hx - 4.5}" cy="${hy + 6}" r="2.6" fill="#e07a6a" opacity="0.35"/><circle cx="${hx + 4.5}" cy="${hy + 6}" r="2.6" fill="#e07a6a" opacity="0.35"/>`);
    } else {
      add(`<path d="M${hx},${hy + 1} Q${hx - 1.6},${hy + 5} ${hx},${hy + 6}" stroke="${kontur}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`);
    }
    // Mund
    const my = hy + ry * 0.58;
    add(gender === 'female'
      ? `<path d="M${hx - 3.4},${my} Q${hx},${my + 3} ${hx + 3.4},${my}" fill="none" stroke="${lippe}" stroke-width="1.5" stroke-linecap="round"/>`
      : `<path d="M${hx - 3.2},${my} Q${hx},${my + 2.4} ${hx + 3.2},${my}" fill="none" stroke="${lippe}" stroke-width="1.1" stroke-linecap="round"/>`);

    // ── Bart (Zwerge immer, außer weiblich; oder als Accessoire) ──
    const zwergBart = volk === 'dwarf' && gender !== 'female';
    if (zwergBart) {
      add(`<path d="M${hx - rx + 0.5},${hy + 1} Q${hx - rx - 3},${hy + ry + 14} ${hx},${hy + ry + 22}
        Q${hx + rx + 3},${hy + ry + 14} ${hx + rx - 0.5},${hy + 1}
        Q${hx + rx * 0.5},${hy + 9} ${hx},${hy + 8.5} Q${hx - rx * 0.5},${hy + 9} ${hx - rx + 0.5},${hy + 1} Z" fill="${haar}"/>`);
      add(`<path d="M${hx - 3},${hy + ry + 14} L${hx},${hy + ry + 19} L${hx + 3},${hy + ry + 14}" stroke="#f2cf6b" stroke-width="1.4" fill="none"/>`);
      add(`<ellipse cx="${hx}" cy="${hy + 4.5}" rx="3.6" ry="3" fill="${haut}" stroke="${kontur}" stroke-width="0.7"/>`);
      add(`<path d="M${hx - 7},${hy + 9} Q${hx - 3},${hy + 6} ${hx},${hy + 8} Q${hx + 3},${hy + 6} ${hx + 7},${hy + 9}" stroke="${haar}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    } else if (acc === 'beard') {
      add(`<path d="M${hx - rx + 1},${hy + 3} Q${hx - rx + 1},${hy + ry + 6} ${hx},${hy + ry + 8} Q${hx + rx - 1},${hy + ry + 6} ${hx + rx - 1},${hy + 3}
        Q${hx + rx * 0.4},${hy + ry * 0.75} ${hx},${hy + ry * 0.75} Q${hx - rx * 0.4},${hy + ry * 0.75} ${hx - rx + 1},${hy + 3} Z" fill="${haar}" opacity="0.92"/>`);
    }

    // ── Haare (oben) ──────────────────────────────────────────────
    if (gender === 'diverse') {
      add(`<path d="M${hx - rx - 0.5},${hy - 2} Q${hx - rx},${hy - ry - 3} ${hx + 2},${hy - ry - 3}
        Q${hx + rx + 4},${hy - ry - 2} ${hx + rx + 2},${hy + 6}
        Q${hx + rx - 2},${hy - ry * 0.5} ${hx - rx * 0.3},${hy - ry * 0.55}
        Q${hx - rx * 0.8},${hy - ry * 0.4} ${hx - rx - 0.5},${hy - 2} Z" fill="${haar}"/>`);
    } else {
      add(`<path d="M${hx - rx - 1},${hy - 1} Q${hx - rx},${hy - ry - 3} ${hx},${hy - ry - 3}
        Q${hx + rx},${hy - ry - 3} ${hx + rx + 1},${hy - 1}
        Q${hx + rx * 0.5},${hy - ry * 0.55} ${hx - rx * 0.15},${hy - ry * 0.5}
        Q${hx - rx * 0.7},${hy - ry * 0.35} ${hx - rx - 1},${hy - 1} Z" fill="${haar}"/>`);
    }
    // Zwergin: zwei dicke Zöpfe
    if (volk === 'dwarf' && gender === 'female') {
      [-1, 1].forEach(s => {
        const zx = hx + s * (rx + 1);
        add(`<path d="M${zx},${hy - 2} Q${zx + s * 3},${hy + 10} ${zx + s * 1},${hy + ry + 12}" stroke="${haar}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`);
        add(`<circle cx="${zx + s * 1}" cy="${hy + ry + 13}" r="2.2" fill="#c9962f"/>`);
      });
    }
    // Elfen: silberner Stirnreif
    if (volk === 'elf' && klasse !== 'mage' && klasse !== 'teacher') {
      add(`<path d="M${hx - rx + 1},${hy - ry * 0.45} Q${hx},${hy - ry * 0.75} ${hx + rx - 1},${hy - ry * 0.45}" stroke="#dfe6ee" stroke-width="1.3" fill="none"/>`);
      add(`<path d="M${hx},${hy - ry * 0.78} l2,2.4 l-2,2.4 l-2,-2.4 z" fill="#7fdcaa" stroke="#dfe6ee" stroke-width="0.5"/>`);
    }

    // ── Accessoires (Gesicht) ─────────────────────────────────────
    if (acc === 'glasses') {
      add(`<g stroke="#2a1a0e" stroke-width="0.9" fill="rgba(255,255,255,.12)">
        <circle cx="${hx - ax}" cy="${ay}" r="3.9"/><circle cx="${hx + ax}" cy="${ay}" r="3.9"/>
        <path d="M${hx - ax + 3.9},${ay} H${hx + ax - 3.9}" fill="none"/></g>`);
    } else if (acc === 'scar') {
      add(`<path d="M${hx - ax - 2},${ay - 6} L${hx - ax + 2},${ay + 6}" stroke="#8a1a1a" stroke-width="1.2" stroke-linecap="round"/>`);
      add(`<path d="M${hx - ax - 1.5},${ay - 2} l2.6,-0.9 M${hx - ax - 0.6},${ay + 1.4} l2.6,-0.9" stroke="#8a1a1a" stroke-width="0.8"/>`);
    } else if (acc === 'freckles') {
      add(`<g fill="#9a5030" opacity="0.6">${[[-6, 4], [-4.5, 5.5], [-7.5, 5.8], [6, 4], [4.5, 5.5], [7.5, 5.8]]
        .map(([x, y]) => `<circle cx="${hx + x}" cy="${hy + y}" r="0.75"/>`).join('')}</g>`);
    } else if (acc === 'braid') {
      add(`<path d="M${hx + rx * 0.6},${hy - ry * 0.6} Q${hx + rx + 6},${hy + 4} ${hx + rx + 3},${hy + ry + 10}" stroke="${haar}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-dasharray="3 1"/>`);
    }

    // ── Kopfbedeckung je Klasse ───────────────────────────────────
    const top = hy - ry;
    if (klasse === 'mage') {
      add(`<path d="M${hx - rx + 1},${top + 5} Q${hx - 3},${top - 8} ${hx + 9},${top - 20} Q${hx + 4},${top - 6} ${hx + rx - 1},${top + 5} Z" fill="${K.stoff}" stroke="${K.stoffDunkel}" stroke-width="0.8"/>`);
      add(`<ellipse cx="${hx}" cy="${top + 5}" rx="${rx + 8}" ry="3.6" fill="${K.stoffDunkel}"/>`);
      add(`<rect x="${hx - rx + 1}" y="${top + 1.2}" width="${2 * rx - 2}" height="2.6" fill="#f2cf6b"/>`);
      add(stern(hx + 2, top - 6, 2.2, '#f2cf6b'));
    } else if (klasse === 'teacher') {
      add(`<path d="M${hx - rx + 1},${top + 4} Q${hx},${top + 1} ${hx + rx - 1},${top + 4} L${hx + rx - 1},${top - 1} L${hx - rx + 1},${top - 1} Z" fill="#1d1d26"/>`);
      add(`<path d="M${hx - rx - 7},${top - 2} L${hx},${top - 8} L${hx + rx + 7},${top - 2} L${hx},${top + 4} Z" fill="#26262f" stroke="#0d0d12" stroke-width="0.6"/>`);
      add(`<path d="M${hx},${top - 2} L${hx + rx + 2},${top + 1} L${hx + rx + 2},${top + 9}" stroke="#f2cf6b" stroke-width="1" fill="none"/>`);
      add(`<circle cx="${hx + rx + 2}" cy="${top + 10}" r="1.4" fill="#f2cf6b"/>`);
    } else if (klasse === 'druid') {
      add(`<path d="M${hx - rx * 0.6},${top + 3} q-3,-8 -9,-12 M${hx - rx * 0.6 - 4},${top - 4} q-5,0 -7,-4 M${hx + rx * 0.6},${top + 3} q3,-8 9,-12 M${hx + rx * 0.6 + 4},${top - 4} q5,0 7,-4" stroke="#7a5426" stroke-width="2" fill="none" stroke-linecap="round"/>`);
      add(blatt(hx - 7, top + 1, -50, '#7fbf5a') + blatt(hx, top - 1, 0, '#9fd46c') + blatt(hx + 7, top + 1, 50, '#7fbf5a'));
    } else if (klasse === 'archer') {
      add(`<path d="M${hx - rx - 3},${top + 6} Q${hx - rx + 2},${top - 6} ${hx + 2},${top - 5} Q${hx + rx + 2},${top - 3} ${hx + rx + 13},${top + 2} Q${hx + rx},${top + 5} ${hx - rx - 3},${top + 6} Z" fill="#3f6b2e" stroke="#24401a" stroke-width="0.8"/>`);
      add(`<path d="M${hx - 1},${top - 4} Q${hx + 9},${top - 18} ${hx + 18},${top - 15} Q${hx + 9},${top - 11} ${hx + 1},${top - 2} Z" fill="#c0392b"/>`);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"
      style="filter:drop-shadow(0 4px 12px ${K.glow});display:block" role="img" aria-hidden="true">${teile.join('')}</svg>`;
  }

  function stern(x, y, r, farbe) {
    return `<path d="M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z" fill="${farbe}"/>`;
  }

  function blatt(x, y, winkel, farbe) {
    return `<path transform="rotate(${winkel} ${x} ${y})" d="M${x},${y + 4} Q${x - 3.5},${y} ${x},${y - 4} Q${x + 3.5},${y} ${x},${y + 4} Z" fill="${farbe}" stroke="#2f5a1f" stroke-width="0.5"/>`;
  }

  window.drawCharakterAvatar = drawCharakterAvatar;
})();
