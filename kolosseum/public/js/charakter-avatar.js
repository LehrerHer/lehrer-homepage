(function () {
  'use strict';

  const CLASSES = [
    { id: 'knight',  label: 'Ritter',       emoji: '⚔️',  primary: '#b08030', accent: '#7a5010', glow: '#c8a04088' },
    { id: 'mage',    label: 'Magier',       emoji: '🔮',  primary: '#7050c0', accent: '#4a2890', glow: '#8060d088' },
    { id: 'druid',   label: 'Waldschrat',   emoji: '🌿',  primary: '#4a8040', accent: '#2a5820', glow: '#60a05088' },
    { id: 'archer',  label: 'Bogenschütze', emoji: '🏹',  primary: '#805030', accent: '#503010', glow: '#a07040 88' },
    { id: 'teacher', label: 'Lehrer',       emoji: '📖',  primary: '#306080', accent: '#104060', glow: '#4080a088' },
  ];

  const SKIN_TONES = [
    { id: 's1', color: '#fde8c8' },
    { id: 's2', color: '#f0c898' },
    { id: 's3', color: '#d4a070' },
    { id: 's4', color: '#9a6038' },
    { id: 's5', color: '#6a3818' },
  ];

  const HAIR_COLORS = [
    { id: 'hc1', color: '#180e06' },
    { id: 'hc2', color: '#6b3a1f' },
    { id: 'hc3', color: '#d4a53a' },
    { id: 'hc4', color: '#9b3a1a' },
    { id: 'hc5', color: '#908880' },
    { id: 'hc6', color: '#e8e0d0' },
    { id: 'hc7', color: '#8040d0' },
    { id: 'hc8', color: '#3a6030' },
  ];

  function drawCharakterAvatar(cfg, size) {
    size = size || 140;
    const cls  = CLASSES.find(c => c.id === cfg.classId)        || CLASSES[0];
    const skin = SKIN_TONES.find(s => s.id === cfg.skinId)      || SKIN_TONES[1];
    const hcol = HAIR_COLORS.find(h => h.id === cfg.hairColorId) || HAIR_COLORS[1];
    const race   = cfg.raceId   || 'human';
    const gender = cfg.genderId || 'male';
    const acc    = cfg.accessoryId || 'none';

    const raceParams = {
      human: { headRx: 22, headRy: 24, bodyW: 34 },
      dwarf: { headRx: 26, headRy: 22, bodyW: 42 },
      elf:   { headRx: 19, headRy: 26, bodyW: 30 },
    };
    const rp = raceParams[race] || raceParams.human;

    const hairPaths = {
      male: {
        human: 'M 50,28 Q 34,16 30,30 Q 28,18 42,13 Q 50,9 58,13 Q 72,18 70,30 Q 66,16 50,28 Z',
        dwarf: 'M 50,28 Q 30,16 28,32 Q 26,18 40,12 Q 50,8 60,12 Q 74,18 72,32 Q 70,16 50,28 Z',
        elf:   'M 50,26 Q 36,14 32,28 Q 30,16 44,11 Q 50,8 56,11 Q 70,16 68,28 Q 64,14 50,26 Z',
      },
      female: {
        human: 'M 50,28 Q 28,16 24,36 Q 22,52 26,65 Q 30,16 50,28 Q 70,16 74,65 Q 78,52 76,36 Q 72,16 50,28 Z',
        dwarf: 'M 50,28 Q 26,16 22,38 Q 20,54 26,68 Q 30,16 50,28 Q 70,16 74,68 Q 80,54 78,38 Q 74,16 50,28 Z',
        elf:   'M 50,26 Q 29,13 25,35 Q 23,50 27,64 Q 31,14 50,26 Q 69,14 73,64 Q 77,50 75,35 Q 71,13 50,26 Z',
      },
      diverse: {
        human: 'M 50,28 Q 30,16 28,30 Q 26,18 42,13 Q 50,9 58,13 Q 72,18 70,30 Q 68,16 50,28 M 50,28 L 62,55 Q 64,58 62,62',
        dwarf: 'M 50,28 Q 28,16 26,32 Q 24,18 40,12 Q 50,8 60,12 Q 74,18 72,32 M 50,28 L 63,56 Q 65,60 63,64',
        elf:   'M 50,26 Q 32,14 30,28 Q 28,16 44,11 Q 50,8 56,11 Q 70,16 68,28 M 50,26 L 63,54 Q 65,58 63,62',
      },
    };
    const hairPath = (hairPaths[gender] || hairPaths.male)[race] || hairPaths.male.human;

    const p  = cls.primary;
    const a  = cls.accent;
    const sc = skin.color;
    const hc = hcol.color;
    const bW = rp.bodyW;
    const bx = 50 - bW / 2;

    const equipment = {
      knight: `<g>
        <rect x="14" y="54" width="11" height="32" rx="2" fill="${p}" stroke="${a}" stroke-width="1.2"/>
        <rect x="17" y="40" width="5" height="16" rx="1" fill="${a}"/>
        <rect x="10" y="52" width="18" height="4" rx="1" fill="${a}"/>
        <ellipse cx="30" cy="67" rx="6" ry="4" fill="${p}" stroke="${a}" stroke-width="1"/>
        <ellipse cx="70" cy="67" rx="6" ry="4" fill="${p}" stroke="${a}" stroke-width="1"/>
      </g>`,
      mage: `<g>
        <line x1="18" y1="58" x2="18" y2="88" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="18" cy="52" r="7" fill="${p}" opacity="0.85" stroke="${a}" stroke-width="1"/>
        <circle cx="18" cy="52" r="4" fill="white" opacity="0.4"/>
        <circle cx="13" cy="47" r="1.5" fill="${p}" opacity="0.7"/>
        <circle cx="24" cy="46" r="1" fill="${p}" opacity="0.6"/>
        <circle cx="11" cy="55" r="1" fill="${p}" opacity="0.5"/>
      </g>`,
      druid: `<g>
        <path d="M 20,88 Q 17,70 19,55 Q 20,45 18,38" stroke="#6b4a20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="18" cy="36" r="5" fill="${p}" opacity="0.8"/>
        <path d="M 15,34 Q 10,28 14,24 Q 20,30 18,36" fill="${p}" opacity="0.7"/>
        <path d="M 21,33 Q 26,26 30,29 Q 26,34 20,36" fill="${p}" opacity="0.6"/>
        <path d="M 68,64 Q 76,58 80,64 Q 76,70 68,66 Z" fill="${p}" opacity="0.7"/>
      </g>`,
      archer: `<g>
        <path d="M 78,42 Q 88,55 78,72" stroke="${a}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <line x1="78" y1="42" x2="78" y2="72" stroke="#c8a060" stroke-width="1" stroke-dasharray="2,2"/>
        <rect x="68" y="58" width="7" height="20" rx="3" fill="${p}" stroke="${a}" stroke-width="1"/>
        <line x1="70" y1="58" x2="70" y2="52" stroke="${a}" stroke-width="1.2"/>
        <line x1="73" y1="58" x2="73" y2="50" stroke="${a}" stroke-width="1.2"/>
      </g>`,
      teacher: `<g>
        <rect x="68" y="55" width="16" height="22" rx="2" fill="${p}" stroke="${a}" stroke-width="1.2"/>
        <rect x="70" y="57" width="12" height="18" rx="1" fill="white" opacity="0.15"/>
        <line x1="70" y1="62" x2="82" y2="62" stroke="${a}" stroke-width="0.8"/>
        <line x1="70" y1="66" x2="82" y2="66" stroke="${a}" stroke-width="0.8"/>
        <line x1="70" y1="70" x2="78" y2="70" stroke="${a}" stroke-width="0.8"/>
        <line x1="20" y1="50" x2="20" y2="85" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="20" cy="48" r="3" fill="${p}"/>
      </g>`,
    };

    const accSVG = {
      glasses: `<g stroke="${a}" stroke-width="1.5" fill="none">
        <rect x="33" y="42" width="13" height="9" rx="2.5"/>
        <rect x="54" y="42" width="13" height="9" rx="2.5"/>
        <line x1="46" y1="46" x2="54" y2="46"/>
        <line x1="33" y1="46" x2="27" y2="44"/>
        <line x1="67" y1="46" x2="73" y2="44"/>
      </g>`,
      scar: `<path d="M 43,37 L 39,52" stroke="#7a1a1a" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>`,
      freckles: `<g fill="#9a5030" opacity="0.45">${[[36,49],[40,51],[44,49],[56,49],[60,51],[64,49],[38,45],[62,45]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.8"/>`).join('')}</g>`,
      beard: `<path d="M 36,60 Q 38,68 50,72 Q 62,68 64,60 Q 57,65 50,66 Q 43,65 36,60 Z" fill="${hc}" opacity="0.85"/>`,
      braid: `<path d="M 50,28 L 50,75 Q 48,72 50,68 Q 52,72 50,75" stroke="${hc}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      none: '',
    };

    const elfEars = race === 'elf'
      ? `<g fill="${sc}" stroke="${sc === '#fde8c8' ? '#c8a080' : '#7a4820'}" stroke-width="0.8">
          <path d="M 28,42 Q 20,36 24,28 Q 30,32 30,42 Z"/>
          <path d="M 72,42 Q 80,36 76,28 Q 70,32 70,42 Z"/>
        </g>` : '';

    const dwarfBeard = (race === 'dwarf' && gender === 'male')
      ? `<path d="M 32,62 Q 34,74 50,78 Q 66,74 68,62 Q 60,70 50,72 Q 40,70 32,62 Z" fill="${hc}" opacity="0.9"/>` : '';

    const eyeRyL = race === 'elf' ? 3.5 : 4.5;
    const eyeRyR = race === 'elf' ? 3.5 : 4.5;
    const eyeRotL = race === 'elf' ? 'transform="rotate(-10,40,42)"' : '';
    const eyeRotR = race === 'elf' ? 'transform="rotate(10,60,42)"' : '';
    const noseStroke  = (sc === '#fde8c8' || sc === '#f0c898') ? '#b88050' : '#4a2808';
    const mouthStroke = (sc === '#fde8c8' || sc === '#f0c898') ? '#b06050' : '#6a2818';
    const mouth = gender === 'female'
      ? `<path d="M 43,59 Q 50,65 57,59" fill="none" stroke="#b05050" stroke-width="2" stroke-linecap="round"/>`
      : `<path d="M 44,59 Q 50,64 56,59" fill="none" stroke="${mouthStroke}" stroke-width="1.5" stroke-linecap="round"/>`;

    const raceEmoji = race === 'dwarf' ? '⛏' : race === 'elf' ? '🌙' : '👤';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"
      style="filter:drop-shadow(0 4px 12px ${cls.glow||'#00000088'});display:block" aria-hidden="true">
      <defs>
        <radialGradient id="kaura-${cls.id}" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stop-color="${p}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="55" r="48" fill="url(#kaura-${cls.id})"/>
      <circle cx="50" cy="50" r="47" fill="none" stroke="${p}" stroke-width="0.5" opacity="0.4"/>
      ${equipment[cls.id] || ''}
      <rect x="${bx}" y="64" width="${bW}" height="22" rx="6" fill="${p}" stroke="${a}" stroke-width="1.2"/>
      <ellipse cx="50" cy="86" rx="${bW/2}" ry="10" fill="${p}" stroke="${a}" stroke-width="1"/>
      <ellipse cx="${bx-3}" cy="72" rx="7" ry="13" fill="${p}" stroke="${a}" stroke-width="1"/>
      <ellipse cx="${bx+bW+3}" cy="72" rx="7" ry="13" fill="${p}" stroke="${a}" stroke-width="1"/>
      <rect x="44" y="58" width="12" height="9" rx="3" fill="${sc}"/>
      ${elfEars}
      <ellipse cx="50" cy="40" rx="${rp.headRx}" ry="${rp.headRy}" fill="${sc}"/>
      <path d="${hairPath}" fill="${hc}" opacity="0.95"/>
      ${dwarfBeard}
      <ellipse cx="40" cy="42" rx="4" ry="${eyeRyL}" fill="white" ${eyeRotL}/>
      <ellipse cx="60" cy="42" rx="4" ry="${eyeRyR}" fill="white" ${eyeRotR}/>
      <circle cx="41" cy="43" r="2.5" fill="#1e1208"/>
      <circle cx="61" cy="43" r="2.5" fill="#1e1208"/>
      <circle cx="42" cy="42" r="0.9" fill="white"/>
      <circle cx="62" cy="42" r="0.9" fill="white"/>
      <path d="M 50,48 Q 48,53 50,55 Q 52,53 50,48" fill="none" stroke="${noseStroke}" stroke-width="1.2" opacity="0.55" stroke-linecap="round"/>
      ${mouth}
      ${accSVG[acc] || ''}
      <text x="84" y="18" text-anchor="middle" font-size="12">${cls.emoji}</text>
      <text x="16" y="18" text-anchor="middle" font-size="10">${raceEmoji}</text>
    </svg>`;
  }

  window.drawCharakterAvatar = drawCharakterAvatar;
})();
