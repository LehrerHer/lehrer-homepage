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
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

function darkenColor(hex, amount = 40) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function starPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * Math.PI / 180;
    const radius = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function drawAvatar(xp) {
  const lv = getLevelInfo(xp);
  const c = lv.color;
  const dk = darkenColor(c, 45);
  const skin = '#FFDAB9';
  const idx = lv.index;
  const gf = lv.glow ? ' filter="url(#lh-glow)"' : '';

  let parts = [];

  // Glow filter
  if (lv.glow) {
    parts.push(`<defs><filter id="lh-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs>`);
  }

  // Level 7: Sparkles
  if (idx >= 6) {
    parts.push(`<polygon points="${starPoints(13, 12, 8)}" fill="#FFD700" opacity="0.95"/>`);
    parts.push(`<polygon points="${starPoints(87, 9, 6)}" fill="#FFE66D" opacity="0.9"/>`);
    parts.push(`<polygon points="${starPoints(9, 92, 5)}" fill="#FFD700" opacity="0.8"/>`);
    parts.push(`<polygon points="${starPoints(91, 88, 7)}" fill="#FFE66D" opacity="0.9"/>`);
  }

  // Cape (level 5+)
  if (idx >= 4) {
    parts.push(`<path d="M34,68 C18,92 20,118 26,123 L50,114 L74,123 C80,118 82,92 66,68Z" fill="${dk}" opacity="0.9"/>`);
  }

  // Legs
  parts.push(`<rect x="36" y="102" width="12" height="17" rx="4" fill="${dk}"/>`);
  parts.push(`<rect x="52" y="102" width="12" height="17" rx="4" fill="${dk}"/>`);
  // Boots
  parts.push(`<rect x="33" y="113" width="18" height="9" rx="4" fill="#3d2b1f"/>`);
  parts.push(`<rect x="49" y="113" width="18" height="9" rx="4" fill="#3d2b1f"/>`);

  // Body
  parts.push(`<rect x="33" y="65" width="34" height="41" rx="10" fill="${c}"${gf}/>`);
  // Belt
  parts.push(`<rect x="33" y="86" width="34" height="7" rx="2" fill="${dk}" opacity="0.45"/>`);
  parts.push(`<rect x="46" y="84" width="8" height="11" rx="3" fill="${dk}" opacity="0.65"/>`);

  // Arms
  parts.push(`<rect x="11" y="67" width="22" height="10" rx="5" fill="${c}"${gf}/>`);
  parts.push(`<rect x="67" y="67" width="22" height="10" rx="5" fill="${c}"${gf}/>`);
  // Hands
  parts.push(`<circle cx="13" cy="72" r="5.5" fill="${skin}"/>`);
  parts.push(`<circle cx="87" cy="72" r="5.5" fill="${skin}"/>`);

  // Neck
  parts.push(`<rect x="44" y="58" width="12" height="11" rx="3" fill="${skin}"/>`);

  // Head
  parts.push(`<circle cx="50" cy="43" r="24" fill="${skin}"${gf}/>`);

  // Hair (on top of head)
  parts.push(`<path d="M26,43 C26,17 74,17 74,43 C65,30 35,30 26,43Z" fill="${c}"/>`);
  parts.push(`<ellipse cx="27" cy="47" rx="5" ry="7.5" fill="${c}"/>`);
  parts.push(`<ellipse cx="73" cy="47" rx="5" ry="7.5" fill="${c}"/>`);

  // Ears
  parts.push(`<ellipse cx="26" cy="44" rx="5" ry="6.5" fill="${skin}"/>`);
  parts.push(`<ellipse cx="74" cy="44" rx="5" ry="6.5" fill="${skin}"/>`);

  // Eye whites
  parts.push(`<ellipse cx="41" cy="43" rx="5.5" ry="6" fill="white"/>`);
  parts.push(`<ellipse cx="59" cy="43" rx="5.5" ry="6" fill="white"/>`);
  // Pupils
  parts.push(`<circle cx="42.5" cy="44" r="3.3" fill="#1a1a2e"/>`);
  parts.push(`<circle cx="60.5" cy="44" r="3.3" fill="#1a1a2e"/>`);
  // Shine
  parts.push(`<circle cx="44" cy="42.3" r="1.3" fill="white"/>`);
  parts.push(`<circle cx="62" cy="42.3" r="1.3" fill="white"/>`);

  // Eyebrows
  parts.push(`<path d="M37,36.5 Q41,34.5 45,36.5" stroke="#5d4037" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);
  parts.push(`<path d="M55,36.5 Q59,34.5 63,36.5" stroke="#5d4037" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);

  // Nose
  parts.push(`<ellipse cx="50" cy="49" rx="2.5" ry="1.8" fill="#e8a87c" opacity="0.55"/>`);

  // Cheeks
  parts.push(`<ellipse cx="35" cy="51" rx="5.5" ry="3.8" fill="#FF9BAA" opacity="0.42"/>`);
  parts.push(`<ellipse cx="65" cy="51" rx="5.5" ry="3.8" fill="#FF9BAA" opacity="0.42"/>`);

  // Smile
  parts.push(`<path d="M43,56 Q50,62 57,56" stroke="#c07850" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);

  // Crown
  if (lv.crown) {
    parts.push(`<path d="M30,23 L35,12 L43,20 L50,10 L57,20 L65,12 L70,23Z" fill="#FFE66D" stroke="#C8A200" stroke-width="1.5"/>`);
    parts.push(`<rect x="30" y="21" width="40" height="7" rx="2" fill="#FFE66D" stroke="#C8A200" stroke-width="1"/>`);
    parts.push(`<circle cx="50" cy="14.5" r="3.5" fill="#FF6B6B"/>`);
    parts.push(`<circle cx="37" cy="17.5" r="2.5" fill="#4ECDC4"/>`);
    parts.push(`<circle cx="63" cy="17.5" r="2.5" fill="#4ECDC4"/>`);
  }

  // Shield (left side)
  if (lv.shield) {
    parts.push(`<path d="M1,63 L1,83 Q1,95 12,98 Q23,95 23,83 L23,63 L12,59Z" fill="${c}" stroke="white" stroke-width="1.5"${gf}/>`);
    parts.push(`<path d="M5,66 L5,82 Q5,89 12,92 Q19,89 19,82 L19,66Z" fill="${dk}" opacity="0.25"/>`);
    parts.push(`<line x1="12" y1="66" x2="12" y2="90" stroke="white" stroke-width="1.3" opacity="0.7"/>`);
    parts.push(`<line x1="5" y1="77" x2="19" y2="77" stroke="white" stroke-width="1.3" opacity="0.7"/>`);
    parts.push(`<circle cx="12" cy="77" r="3.5" fill="white" opacity="0.5"/>`);
  }

  // Sword (right side)
  if (lv.sword) {
    parts.push(`<rect x="82" y="42" width="5" height="34" rx="2" fill="#d4d4d4" stroke="#999" stroke-width="0.7"/>`);
    parts.push(`<path d="M82,42 L84.5,33 L87,42Z" fill="#d4d4d4" stroke="#999" stroke-width="0.5"/>`);
    parts.push(`<rect x="77" y="72" width="16" height="5" rx="2.5" fill="#b8860b"/>`);
    parts.push(`<rect x="81" y="77" width="7" height="15" rx="3" fill="#8B6914"/>`);
    parts.push(`<line x1="81" y1="80" x2="88" y2="80" stroke="#d4a017" stroke-width="1.5" opacity="0.65"/>`);
    parts.push(`<line x1="81" y1="83" x2="88" y2="83" stroke="#d4a017" stroke-width="1.5" opacity="0.65"/>`);
    parts.push(`<line x1="81" y1="86" x2="88" y2="86" stroke="#d4a017" stroke-width="1.5" opacity="0.65"/>`);
    parts.push(`<ellipse cx="84.5" cy="93" rx="4.5" ry="3.5" fill="#b8860b"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="100%" height="100%">${parts.join('')}</svg>`;
}
