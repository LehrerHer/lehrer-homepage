import { useState } from "react";

// ══════════════════════════════════════════════════════
//  DATEN
// ══════════════════════════════════════════════════════

const CLASSES = [
  { id: "knight",   label: "Ritter",       emoji: "⚔️",  primary: "#b08030", accent: "#7a5010", glow: "#c8a04088" },
  { id: "mage",     label: "Magier",       emoji: "🔮",  primary: "#7050c0", accent: "#4a2890", glow: "#8060d088" },
  { id: "druid",    label: "Waldschrat",   emoji: "🌿",  primary: "#4a8040", accent: "#2a5820", glow: "#60a05088" },
  { id: "archer",   label: "Bogenschütze", emoji: "🏹",  primary: "#805030", accent: "#503010", glow: "#a07040 88" },
  { id: "teacher",  label: "Lehrer",       emoji: "📖",  primary: "#306080", accent: "#104060", glow: "#4080a088" },
];

const RACES = [
  { id: "human",  label: "Mensch", emoji: "👤", desc: "Vielseitig & anpassungsfähig" },
  { id: "dwarf",  label: "Zwerg",  emoji: "⛏️", desc: "Klein, aber unglaublich zäh" },
  { id: "elf",    label: "Elfe",   emoji: "🌙", desc: "Anmutig & mit spitzen Ohren" },
];

const GENDERS = [
  { id: "male",    label: "Männlich", symbol: "♂" },
  { id: "female",  label: "Weiblich", symbol: "♀" },
  { id: "diverse", label: "Divers",   symbol: "⚧" },
];

const SKIN_TONES = [
  { id: "s1", label: "Elfenbein", color: "#fde8c8" },
  { id: "s2", label: "Warm",      color: "#f0c898" },
  { id: "s3", label: "Mittel",    color: "#d4a070" },
  { id: "s4", label: "Dunkel",    color: "#9a6038" },
  { id: "s5", label: "Tief",      color: "#6a3818" },
];

const HAIR_COLORS = [
  { id: "hc1", label: "Schwarz",   color: "#180e06" },
  { id: "hc2", label: "Braun",     color: "#6b3a1f" },
  { id: "hc3", label: "Blond",     color: "#d4a53a" },
  { id: "hc4", label: "Rotbraun",  color: "#9b3a1a" },
  { id: "hc5", label: "Grau",      color: "#908880" },
  { id: "hc6", label: "Weiß",      color: "#e8e0d0" },
  { id: "hc7", label: "Magisch",   color: "#8040d0" },
  { id: "hc8", label: "Moosgr.",   color: "#3a6030" },
];

const ACCESSORIES = [
  { id: "none",     label: "Keins" },
  { id: "glasses",  label: "Brille" },
  { id: "scar",     label: "Narbe" },
  { id: "freckles", label: "Sommersp." },
  { id: "beard",    label: "Bart" },
  { id: "braid",    label: "Zopf" },
];

// ══════════════════════════════════════════════════════
//  SVG AVATAR – kontextsensitiv nach Rasse, Geschlecht, Klasse
// ══════════════════════════════════════════════════════

function AvatarSVG({ config, size = 200 }) {
  const cls    = CLASSES.find(c => c.id === config.classId)   || CLASSES[0];
  const skin   = SKIN_TONES.find(s => s.id === config.skinId) || SKIN_TONES[1];
  const hcol   = HAIR_COLORS.find(h => h.id === config.hairColorId) || HAIR_COLORS[1];
  const race   = config.raceId  || "human";
  const gender = config.genderId || "male";
  const acc    = config.accessoryId || "none";

  // ── Typ-Parameter ──────────────────────────────────
  // Zwerge: breiter Kopf, breiterer Körper, kleiner
  // Elfen: schmales Gesicht, Spitzohren
  // Menschen: standard
  const raceParams = {
    human: { headRx: 22, headRy: 24, bodyW: 34, bodyH: 20, earL: null, earR: null, scale: 1.0, offsetY: 0 },
    dwarf: { headRx: 26, headRy: 22, bodyW: 42, bodyH: 18, earL: null, earR: null, scale: 0.9, offsetY: 5 },
    elf:   { headRx: 19, headRy: 26, bodyW: 30, bodyH: 20, earL: "left", earR: "right", scale: 1.0, offsetY: 0 },
  };
  const rp = raceParams[race];

  // ── Geschlechts-Haar ──────────────────────────────
  // male: kurz/standard, female: länger, diverse: asymmetrisch
  const hairPaths = {
    male: {
      human: "M 50,28 Q 34,16 30,30 Q 28,18 42,13 Q 50,9 58,13 Q 72,18 70,30 Q 66,16 50,28 Z",
      dwarf: "M 50,28 Q 30,16 28,32 Q 26,18 40,12 Q 50,8 60,12 Q 74,18 72,32 Q 70,16 50,28 Z",
      elf:   "M 50,26 Q 36,14 32,28 Q 30,16 44,11 Q 50,8 56,11 Q 70,16 68,28 Q 64,14 50,26 Z",
    },
    female: {
      human: "M 50,28 Q 28,16 24,36 Q 22,52 26,65 Q 30,16 50,28 Q 70,16 74,65 Q 78,52 76,36 Q 72,16 50,28 Z",
      dwarf: "M 50,28 Q 26,16 22,38 Q 20,54 26,68 Q 30,16 50,28 Q 70,16 74,68 Q 80,54 78,38 Q 74,16 50,28 Z",
      elf:   "M 50,26 Q 29,13 25,35 Q 23,50 27,64 Q 31,14 50,26 Q 69,14 73,64 Q 77,50 75,35 Q 71,13 50,26 Z",
    },
    diverse: {
      human: "M 50,28 Q 30,16 28,30 Q 26,18 42,13 Q 50,9 58,13 Q 72,18 70,30 Q 68,16 50,28 M 50,28 L 62,55 Q 64,58 62,62",
      dwarf: "M 50,28 Q 28,16 26,32 Q 24,18 40,12 Q 50,8 60,12 Q 74,18 72,32 M 50,28 L 63,56 Q 65,60 63,64",
      elf:   "M 50,26 Q 32,14 30,28 Q 28,16 44,11 Q 50,8 56,11 Q 70,16 68,28 M 50,26 L 63,54 Q 65,58 63,62",
    },
  };

  const hairPath = hairPaths[gender]?.[race] || hairPaths.male.human;

  // ── Klassen-Ausrüstung ────────────────────────────
  const equipment = {
    knight: (
      <g>
        <rect x="14" y="54" width="11" height="32" rx="2" fill={cls.primary} stroke={cls.accent} strokeWidth="1.2"/>
        <rect x="17" y="40" width="5" height="16" rx="1" fill={cls.accent}/>
        <rect x="10" y="52" width="18" height="4" rx="1" fill={cls.accent}/>
        {/* Schulter-Epauletten */}
        <ellipse cx="30" cy="67" rx="6" ry="4" fill={cls.primary} stroke={cls.accent} strokeWidth="1"/>
        <ellipse cx="70" cy="67" rx="6" ry="4" fill={cls.primary} stroke={cls.accent} strokeWidth="1"/>
      </g>
    ),
    mage: (
      <g>
        <line x1="18" y1="58" x2="18" y2="88" stroke={cls.accent} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="18" cy="52" r="7" fill={cls.primary} opacity="0.85" stroke={cls.accent} strokeWidth="1"/>
        <circle cx="18" cy="52" r="4" fill="white" opacity="0.4"/>
        {/* Magie-Funken */}
        <circle cx="13" cy="47" r="1.5" fill={cls.primary} opacity="0.7"/>
        <circle cx="24" cy="46" r="1" fill={cls.primary} opacity="0.6"/>
        <circle cx="11" cy="55" r="1" fill={cls.primary} opacity="0.5"/>
      </g>
    ),
    druid: (
      <g>
        {/* Ast-Stab */}
        <path d="M 20,88 Q 17,70 19,55 Q 20,45 18,38" stroke="#6b4a20" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="18" cy="36" r="5" fill={cls.primary} opacity="0.8"/>
        <path d="M 15,34 Q 10,28 14,24 Q 20,30 18,36" fill={cls.primary} opacity="0.7"/>
        <path d="M 21,33 Q 26,26 30,29 Q 26,34 20,36" fill={cls.primary} opacity="0.6"/>
        {/* Blatt auf Schulter */}
        <path d="M 68,64 Q 76,58 80,64 Q 76,70 68,66 Z" fill={cls.primary} opacity="0.7"/>
      </g>
    ),
    archer: (
      <g>
        {/* Bogen */}
        <path d="M 78,42 Q 88,55 78,72" stroke={cls.accent} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="78" y1="42" x2="78" y2="72" stroke="#c8a060" strokeWidth="1" strokeDasharray="2,2"/>
        {/* Köcher auf Rücken */}
        <rect x="68" y="58" width="7" height="20" rx="3" fill={cls.primary} stroke={cls.accent} strokeWidth="1"/>
        <line x1="70" y1="58" x2="70" y2="52" stroke={cls.accent} strokeWidth="1.2"/>
        <line x1="73" y1="58" x2="73" y2="50" stroke={cls.accent} strokeWidth="1.2"/>
      </g>
    ),
    teacher: (
      <g>
        {/* Buch */}
        <rect x="68" y="55" width="16" height="22" rx="2" fill={cls.primary} stroke={cls.accent} strokeWidth="1.2"/>
        <rect x="70" y="57" width="12" height="18" rx="1" fill="white" opacity="0.15"/>
        <line x1="70" y1="62" x2="82" y2="62" stroke={cls.accent} strokeWidth="0.8"/>
        <line x1="70" y1="66" x2="82" y2="66" stroke={cls.accent} strokeWidth="0.8"/>
        <line x1="70" y1="70" x2="78" y2="70" stroke={cls.accent} strokeWidth="0.8"/>
        {/* Zeige-Zepter */}
        <line x1="20" y1="50" x2="20" y2="85" stroke={cls.accent} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="20" cy="48" r="3" fill={cls.primary}/>
      </g>
    ),
  };

  // ── Accessoires ───────────────────────────────────
  const accElements = {
    glasses: (
      <g stroke={cls.accent} strokeWidth="1.5" fill="none">
        <rect x="33" y="42" width="13" height="9" rx="2.5"/>
        <rect x="54" y="42" width="13" height="9" rx="2.5"/>
        <line x1="46" y1="46" x2="54" y2="46"/>
        <line x1="33" y1="46" x2="27" y2="44"/>
        <line x1="67" y1="46" x2="73" y2="44"/>
      </g>
    ),
    scar: (
      <path d="M 43,37 L 39,52" stroke="#7a1a1a" strokeWidth="1.8" strokeLinecap="round" opacity="0.85"/>
    ),
    freckles: (
      <g fill="#9a5030" opacity="0.45">
        {[[36,49],[40,51],[44,49],[56,49],[60,51],[64,49],[38,45],[62,45]].map(([x,y],i) =>
          <circle key={i} cx={x} cy={y} r="1.8"/>
        )}
      </g>
    ),
    beard: (
      <path d="M 36,60 Q 38,68 50,72 Q 62,68 64,60 Q 57,65 50,66 Q 43,65 36,60 Z" fill={hcol.color} opacity="0.85"/>
    ),
    braid: (
      <path d="M 50,28 L 50,75 Q 48,72 50,68 Q 52,72 50,75" stroke={hcol.color} strokeWidth="3" fill="none" strokeLinecap="round"/>
    ),
    none: null,
  };

  // ── Rassen-Spitzohren (Elf) ───────────────────────
  const elfEars = race === "elf" ? (
    <g fill={skin.color} stroke={skin.color === "#fde8c8" ? "#c8a080" : "#7a4820"} strokeWidth="0.8">
      <path d="M 28,42 Q 20,36 24,28 Q 30,32 30,42 Z"/>
      <path d="M 72,42 Q 80,36 76,28 Q 70,32 70,42 Z"/>
    </g>
  ) : null;

  // ── Zwerg-Bart (immer, falls männlich) ─────────────
  const dwarfBeard = (race === "dwarf" && gender === "male") ? (
    <path d="M 32,62 Q 34,74 50,78 Q 66,74 68,62 Q 60,70 50,72 Q 40,70 32,62 Z" fill={hcol.color} opacity="0.9"/>
  ) : null;

  // ── Körperproportion nach Rasse ───────────────────
  const bW = rp.bodyW;
  const bx = 50 - bW / 2;

  // ── Gesichtsform ──────────────────────────────────
  const headRx = rp.headRx;
  const headRy = rp.headRy;

  // ── Augen-Stil: Elf → leicht mandelförmig ─────────
  const eyeStyle = race === "elf"
    ? { rx: 4, ry: 3.5, rotation: "rotate(-10,40,42)" }
    : { rx: 4, ry: 4.5, rotation: "" };
  const eyeStyleR = race === "elf"
    ? { rx: 4, ry: 3.5, rotation: "rotate(10,60,42)" }
    : { rx: 4, ry: 4.5, rotation: "" };

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}
      style={{ filter: `drop-shadow(0 6px 18px ${cls.glow || "#00000088"})`, display: "block" }}>

      {/* Hintergrund-Aura */}
      <defs>
        <radialGradient id={`aura-${config.classId}`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={cls.primary} stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="55" r="48" fill={`url(#aura-${config.classId})`}/>
      <circle cx="50" cy="50" r="47" fill="none" stroke={cls.primary} strokeWidth="0.5" opacity="0.4"/>

      {/* Ausrüstung/Klasse */}
      {equipment[config.classId]}

      {/* Körper */}
      <rect x={bx} y="64" width={bW} height="22" rx="6" fill={cls.primary} stroke={cls.accent} strokeWidth="1.2"/>
      <ellipse cx="50" cy="86" rx={bW / 2} ry="10" fill={cls.primary} stroke={cls.accent} strokeWidth="1"/>

      {/* Arme */}
      <ellipse cx={bx - 3} cy="72" rx="7" ry="13" fill={cls.primary} stroke={cls.accent} strokeWidth="1"/>
      <ellipse cx={bx + bW + 3} cy="72" rx="7" ry="13" fill={cls.primary} stroke={cls.accent} strokeWidth="1"/>

      {/* Hals */}
      <rect x="44" y="58" width="12" height="9" rx="3" fill={skin.color}/>

      {/* Spitzohren Elf (hinter Kopf) */}
      {elfEars}

      {/* Kopf */}
      <ellipse cx="50" cy="40" rx={headRx} ry={headRy} fill={skin.color}/>

      {/* Haare */}
      <path d={hairPath} fill={hcol.color} opacity="0.95"/>

      {/* Zwerg-Bart */}
      {dwarfBeard}

      {/* Gesicht: Augen */}
      <ellipse cx="40" cy="42" rx={eyeStyle.rx} ry={eyeStyle.ry} fill="white" transform={eyeStyle.rotation}/>
      <ellipse cx="60" cy="42" rx={eyeStyleR.rx} ry={eyeStyleR.ry} fill="white" transform={eyeStyleR.rotation}/>
      <circle cx="41" cy="43" r="2.5" fill="#1e1208"/>
      <circle cx="61" cy="43" r="2.5" fill="#1e1208"/>
      <circle cx="42" cy="42" r="0.9" fill="white"/>
      <circle cx="62" cy="42" r="0.9" fill="white"/>

      {/* Nase */}
      <path d="M 50,48 Q 48,53 50,55 Q 52,53 50,48"
        fill="none"
        stroke={skin.color === "#fde8c8" || skin.color === "#f0c898" ? "#b88050" : "#4a2808"}
        strokeWidth="1.2" opacity="0.55" strokeLinecap="round"/>

      {/* Mund – weiblich leicht voller */}
      {gender === "female"
        ? <path d="M 43,59 Q 50,65 57,59" fill="none" stroke="#b05050" strokeWidth="2" strokeLinecap="round"/>
        : <path d="M 44,59 Q 50,64 56,59" fill="none" stroke={skin.color === "#fde8c8" || skin.color === "#f0c898" ? "#b06050" : "#6a2818"} strokeWidth="1.5" strokeLinecap="round"/>
      }

      {/* Accessoire */}
      {accElements[acc] || null}

      {/* Klassen-Emblem oben rechts */}
      <text x="84" y="18" textAnchor="middle" fontSize="12">{cls.emoji}</text>
      {/* Rassen-Emblem oben links */}
      <text x="16" y="18" textAnchor="middle" fontSize="10">
        {race === "dwarf" ? "⛏" : race === "elf" ? "🌙" : "👤"}
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════
//  UI HELFER
// ══════════════════════════════════════════════════════

function Section({ title }) {
  return (
    <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#c8a84a", textTransform: "uppercase",
      marginBottom: "8px", marginTop: "18px", fontFamily: "serif", opacity: 0.8,
      borderBottom: "1px solid rgba(200,168,74,0.2)", paddingBottom: "4px" }}>
      {title}
    </div>
  );
}

function ChipRow({ options, selected, onSelect, render }) {
  return (
    <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "4px" }}>
      {options.map(opt => {
        const active = selected === opt.id;
        return (
          <button key={opt.id} onClick={() => onSelect(opt.id)} style={{
            background: active ? "linear-gradient(135deg, #c8a030 0%, #8b6010 100%)" : "rgba(255,255,255,0.04)",
            border: active ? "1.5px solid #e0c060" : "1.5px solid rgba(200,168,74,0.25)",
            borderRadius: "7px", padding: "5px 10px", cursor: "pointer",
            color: active ? "#1a1004" : "#d4b860",
            fontSize: "12px", fontFamily: "serif",
            boxShadow: active ? "0 2px 10px rgba(200,160,48,0.45)" : "none",
            transition: "all 0.18s", display: "flex", alignItems: "center", gap: "5px",
          }}>
            {render ? render(opt) : opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorDot({ color, label, selected, onSelect }) {
  return (
    <button onClick={onSelect} title={label} style={{
      width: 28, height: 28, borderRadius: "50%", background: color,
      border: selected ? "2.5px solid #f0d060" : "2px solid rgba(255,255,255,0.15)",
      cursor: "pointer", boxShadow: selected ? `0 0 8px ${color}` : "none",
      transition: "all 0.18s", outline: "none",
    }}/>
  );
}

// ══════════════════════════════════════════════════════
//  HAUPT-KOMPONENTE
// ══════════════════════════════════════════════════════

const DEFAULT = {
  classId: "knight", raceId: "human", genderId: "male",
  skinId: "s2", hairColorId: "hc2", accessoryId: "none", name: "",
};

export default function AvatarCreator() {
  const [cfg, setCfg] = useState(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [json, setJson] = useState("");

  const set = (key, val) => { setCfg(p => ({ ...p, [key]: val })); setSaved(false); setJson(""); };

  const cls  = CLASSES.find(c => c.id === cfg.classId) || CLASSES[0];
  const race = RACES.find(r => r.id === cfg.raceId) || RACES[0];
  const gend = GENDERS.find(g => g.id === cfg.genderId) || GENDERS[0];

  const handleSave = () => {
    const out = JSON.stringify({ ...cfg, createdAt: new Date().toISOString() }, null, 2);
    setJson(out);
    setSaved(true);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 10%, #1c0e04 0%, #0c0804 50%, #060402 100%)",
      fontFamily: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
      color: "#d4b86a",
      padding: "20px 14px 40px",
    }}>
      {/* ── Header ── */}
      <header style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "5px", color: "#c8a84a", opacity: 0.6, marginBottom: "4px" }}>
          ✦ LERNKOLOSSEUM ✦
        </div>
        <h1 style={{
          fontSize: "clamp(20px,5vw,30px)", margin: "0 0 6px",
          background: "linear-gradient(180deg, #f5e080 0%, #c89020 60%, #8b5e10 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "3px", textShadow: "none",
        }}>
          Charaktererstellung
        </h1>
        <div style={{ width: "180px", height: "1px", background: "linear-gradient(90deg,transparent,#c8a84a,transparent)", margin: "0 auto" }}/>
      </header>

      {/* ── Layout ── */}
      <div style={{
        maxWidth: "760px", margin: "0 auto",
        display: "grid", gridTemplateColumns: "minmax(180px,220px) 1fr", gap: "20px",
      }}>

        {/* ── Linke Spalte: Avatar-Vorschau ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: `radial-gradient(circle at 50% 40%, ${cls.primary}20 0%, #0d0805 70%)`,
            border: `1.5px solid ${cls.accent}`,
            borderRadius: "18px", padding: "18px 14px",
            boxShadow: `0 0 40px ${cls.glow || "#00000060"}, inset 0 0 20px rgba(0,0,0,0.6)`,
            transition: "border-color 0.4s, box-shadow 0.4s",
            width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <AvatarSVG config={cfg} size={180}/>

            {/* Badges */}
            <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { label: `${cls.emoji} ${cls.label}`, color: cls.primary },
                { label: `${race.emoji} ${race.label}`, color: "#608060" },
                { label: `${gend.symbol} ${gend.label}`, color: "#607090" },
              ].map((b, i) => (
                <span key={i} style={{
                  padding: "2px 9px", borderRadius: "12px", fontSize: "11px",
                  background: `${b.color}28`, border: `1px solid ${b.color}60`,
                  color: b.color, letterSpacing: "0.5px",
                }}>{b.label}</span>
              ))}
            </div>

            {/* Name */}
            <input
              type="text" maxLength={22} placeholder="Charaktername…"
              value={cfg.name} onChange={e => set("name", e.target.value)}
              style={{
                marginTop: "12px", background: "rgba(0,0,0,0.45)",
                border: `1px solid ${cls.accent}70`, borderRadius: "7px",
                padding: "7px 12px", color: "#f0d070", fontSize: "13px",
                fontFamily: "serif", textAlign: "center", width: "85%", outline: "none",
              }}
            />
          </div>

          {/* Speichern */}
          <button onClick={handleSave} style={{
            width: "100%", padding: "11px",
            background: saved
              ? "linear-gradient(135deg,#3a6a3a,#244824)"
              : "linear-gradient(135deg,#c8a030,#7a5c10)",
            border: "none", borderRadius: "9px",
            color: saved ? "#90e090" : "#1a0e04",
            fontSize: "13px", fontFamily: "serif", fontWeight: "bold",
            letterSpacing: "2px", cursor: "pointer",
            boxShadow: saved ? "0 2px 12px #3a8a3a50" : "0 2px 14px #c8902050",
            transition: "all 0.3s",
          }}>
            {saved ? "✓ Gespeichert" : "⚔ Charakter fertig"}
          </button>

          {/* JSON Output */}
          {json && (
            <pre style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(0,0,0,0.65)", border: "1px solid #c8a84a30",
              borderRadius: "8px", padding: "10px", fontSize: "10px",
              color: "#70c070", fontFamily: "monospace", whiteSpace: "pre-wrap",
              wordBreak: "break-all", maxHeight: "130px", overflow: "auto", margin: 0,
            }}>{json}</pre>
          )}
        </div>

        {/* ── Rechte Spalte: Optionen ── */}
        <div style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(200,168,74,0.15)",
          borderRadius: "14px", padding: "16px 18px",
          overflowY: "auto", maxHeight: "660px",
        }}>

          <Section title="Klasse"/>
          <ChipRow
            options={CLASSES} selected={cfg.classId} onSelect={v => set("classId", v)}
            render={o => <><span>{o.emoji}</span><span>{o.label}</span></>}
          />

          <Section title="Rasse / Typ"/>
          <ChipRow
            options={RACES} selected={cfg.raceId} onSelect={v => set("raceId", v)}
            render={o => (
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span>{o.emoji}</span><span>{o.label}</span>
                </div>
                <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "1px" }}>{o.desc}</div>
              </div>
            )}
          />

          <Section title="Geschlecht"/>
          <ChipRow
            options={GENDERS} selected={cfg.genderId} onSelect={v => set("genderId", v)}
            render={o => <><span style={{ fontSize: "14px" }}>{o.symbol}</span><span>{o.label}</span></>}
          />

          <Section title="Hautton"/>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            {SKIN_TONES.map(s => (
              <ColorDot key={s.id} color={s.color} label={s.label}
                selected={cfg.skinId === s.id} onSelect={() => set("skinId", s.id)}/>
            ))}
          </div>

          <Section title="Haarfarbe"/>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            {HAIR_COLORS.map(h => (
              <ColorDot key={h.id} color={h.color} label={h.label}
                selected={cfg.hairColorId === h.id} onSelect={() => set("hairColorId", h.id)}/>
            ))}
          </div>

          <Section title="Accessoire"/>
          <ChipRow
            options={ACCESSORIES} selected={cfg.accessoryId} onSelect={v => set("accessoryId", v)}
          />

          {/* Hinweis-Box */}
          <div style={{
            marginTop: "22px", padding: "11px 13px",
            background: "rgba(200,168,74,0.05)", borderRadius: "8px",
            border: "1px solid rgba(200,168,74,0.12)",
            fontSize: "11px", color: "#c8a84a80", lineHeight: "1.65",
          }}>
            <strong style={{ color: "#c8a84aaa" }}>Hinweis</strong><br/>
            Zwerge bekommen automatisch einen Bart (m.), Elfen erhalten Spitzohren.
            Der JSON-Output kann direkt an das Node.js-Backend des Lernkolosseum gesendet werden.
          </div>
        </div>
      </div>
    </div>
  );
}
