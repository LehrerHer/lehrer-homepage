(function () {
  const LEVELS = [
    { name: 'Lehrling',  xpNeeded: 0,    color: '#a0aec0', glow: false, crown: false, sword: false, shield: false },
    { name: 'Entdecker', xpNeeded: 100,  color: '#68d391', glow: false, crown: false, sword: false, shield: false },
    { name: 'Kämpfer',   xpNeeded: 250,  color: '#4299e1', glow: false, crown: false, sword: true,  shield: false },
    { name: 'Held',      xpNeeded: 500,  color: '#9f7aea', glow: true,  crown: false, sword: true,  shield: true  },
    { name: 'Ritter',    xpNeeded: 900,  color: '#f6ad55', glow: true,  crown: false, sword: true,  shield: true  },
    { name: 'Champion',  xpNeeded: 1400, color: '#fc8181', glow: true,  crown: true,  sword: true,  shield: true  },
    { name: 'Legende',   xpNeeded: 2000, color: '#ffd700', glow: true,  crown: true,  sword: true,  shield: true  },
  ];

  function getLevelInfo(xp) {
    let idx = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpNeeded) { idx = i; break; }
    }
    const current = LEVELS[idx];
    const next = idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;
    const xpInLevel = xp - current.xpNeeded;
    const xpNeededForNext = next ? next.xpNeeded - current.xpNeeded : 1;
    const progress = next ? Math.min(xpInLevel / xpNeededForNext, 1) : 1;
    return { index: idx, level: current, next, progress, xpInLevel, xpNeededForNext };
  }

  function drawAvatar(xp) {
    const { index: lvlIdx, level } = getLevelInfo(xp);
    const c   = level.color;
    const hasCape     = lvlIdx >= 4;
    const hasSparkle  = lvlIdx >= 6;
    const skin  = '#FFD5A8';
    const dark  = '#1a1a2e';
    const uid   = Math.random().toString(36).slice(2, 7);

    let parts = [];

    // Glow filter
    if (level.glow) {
      parts.push(`<defs>
        <filter id="glow-${uid}" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
          <feFlood flood-color="${c}" flood-opacity="0.55" result="col"/>
          <feComposite in="col" in2="blur" operator="in" result="shadow"/>
          <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>`);
    }

    const gAttr = level.glow ? ` filter="url(#glow-${uid})"` : '';
    parts.push(`<g${gAttr}>`);

    // Cape (behind everything, drawn first)
    if (hasCape) {
      parts.push(`<path d="M46,82 Q6,124 38,146 Q70,152 102,146 Q134,124 94,82 Z"
        fill="${c}" opacity="0.65"/>`);
    }

    // Body
    parts.push(`<rect x="46" y="76" width="48" height="36" rx="12" fill="${c}"/>`);

    // Arms
    parts.push(`<rect x="26" y="78" width="22" height="28" rx="9" fill="${c}"/>`);
    parts.push(`<circle cx="37" cy="108" r="9" fill="${skin}"/>`);
    parts.push(`<rect x="92" y="78" width="22" height="28" rx="9" fill="${c}"/>`);
    parts.push(`<circle cx="103" cy="108" r="9" fill="${skin}"/>`);

    // Legs
    parts.push(`<rect x="50" y="110" width="17" height="23" rx="6" fill="${c}"/>`);
    parts.push(`<rect x="73" y="110" width="17" height="23" rx="6" fill="${c}"/>`);

    // Boots
    parts.push(`<ellipse cx="57" cy="136" rx="13" ry="8" fill="${dark}"/>`);
    parts.push(`<ellipse cx="83" cy="136" rx="13" ry="8" fill="${dark}"/>`);

    // Neck
    parts.push(`<rect x="62" y="68" width="16" height="12" rx="4" fill="${skin}"/>`);

    // Head
    parts.push(`<circle cx="70" cy="46" r="27" fill="${skin}"/>`);

    // Eyes (whites)
    parts.push(`<circle cx="60" cy="42" r="6" fill="white"/>`);
    parts.push(`<circle cx="80" cy="42" r="6" fill="white"/>`);
    // Pupils
    parts.push(`<circle cx="61" cy="43" r="3.5" fill="${dark}"/>`);
    parts.push(`<circle cx="81" cy="43" r="3.5" fill="${dark}"/>`);
    // Eye shine
    parts.push(`<circle cx="62.5" cy="41.5" r="1.2" fill="white"/>`);
    parts.push(`<circle cx="82.5" cy="41.5" r="1.2" fill="white"/>`);

    // Cheeks
    parts.push(`<circle cx="49" cy="54" r="8" fill="#ffb3b3" opacity="0.45"/>`);
    parts.push(`<circle cx="91" cy="54" r="8" fill="#ffb3b3" opacity="0.45"/>`);

    // Smile
    parts.push(`<path d="M62,59 Q70,68 78,59" stroke="${dark}" stroke-width="2.8"
      fill="none" stroke-linecap="round"/>`);

    // Crown
    if (level.crown) {
      const gold = lvlIdx >= 6 ? '#ffd700' : '#f6c90e';
      parts.push(`<g fill="${gold}">
        <polygon points="44,30 52,19 60,29 70,16 80,29 88,19 96,30 96,38 44,38"/>
        <rect x="44" y="36" width="52" height="10" rx="3"/>
        <circle cx="53" cy="37" r="4" fill="#ff6b6b"/>
        <circle cx="70" cy="34" r="4" fill="#4ecdc4"/>
        <circle cx="87" cy="37" r="4" fill="#ff6b6b"/>
      </g>`);
    }

    // Shield (left side)
    if (level.shield) {
      parts.push(`<g transform="translate(3,80)">
        <path d="M0,0 L26,0 L26,26 L13,36 L0,26 Z" fill="#4a5568" stroke="#718096" stroke-width="1.5"/>
        <path d="M4,4 L22,4 L22,24 L13,32 L4,24 Z" fill="${c}" opacity="0.75"/>
        <line x1="13" y1="4" x2="13" y2="32" stroke="white" stroke-width="1.5" opacity="0.5"/>
        <line x1="4"  y1="16" x2="22" y2="16" stroke="white" stroke-width="1.5" opacity="0.5"/>
      </g>`);
    }

    // Sword (right side)
    if (level.sword) {
      parts.push(`<g transform="translate(112,66) rotate(12)">
        <rect x="-3.5" y="-54" width="7" height="58" rx="2.5" fill="#c8d0d8"/>
        <rect x="-1.5" y="-52" width="2" height="50" rx="1" fill="white" opacity="0.35"/>
        <rect x="-12" y="3"   width="24" height="6"  rx="3" fill="#8b6914"/>
        <rect x="-4"  y="8"   width="8"  height="20" rx="3" fill="#6b4c11"/>
        <circle cx="0" cy="30" r="6" fill="#8b6914"/>
      </g>`);
    }

    // Sparkle stars (Legende only)
    if (hasSparkle) {
      const star = (x, y, r) =>
        `<path d="M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y}
          L${x + r * 0.3},${y + r * 0.3} L${x},${y + r}
          L${x - r * 0.3},${y + r * 0.3} L${x - r},${y}
          L${x - r * 0.3},${y - r * 0.3} Z"
          fill="#ffd700" opacity="0.9"/>`;
      parts.push(star(14, 10, 8));
      parts.push(star(126, 10, 8));
      parts.push(star(8,  26, 5));
      parts.push(star(132, 26, 5));
    }

    parts.push('</g>');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 150"
      width="140" height="150" aria-hidden="true">${parts.join('')}</svg>`;
  }

  window.LEVELS       = LEVELS;
  window.drawAvatar   = drawAvatar;
  window.getLevelInfo = getLevelInfo;
})();
