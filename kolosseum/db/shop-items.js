/**
 * Gemeinsame Itemdefinitionen für den Gladiatorenshop.
 * Titel: werden neben dem Nick in Rangliste & Profil angezeigt.
 * Effekte: animierte Einzugseffekte in kampf.html.
 */
const SHOP_ITEMS = [
  // ── Titel ──────────────────────────────────────────────────────────────────
  {
    id:          'titel_blut',
    name:        'Blutgladiator',
    type:        'titel',
    emoji:       '🩸',
    preis:       25,
    beschreibung: 'Für Gladiatoren, die ihren ersten Sieg errungen haben. ⚔️ +3 % Angriff im Kampf.',
  },
  {
    id:          'titel_loewe',
    name:        'Löwenherz',
    type:        'titel',
    emoji:       '🦁',
    preis:       60,
    beschreibung: 'Du trägst den Mut des Königs der Savanne. ❤️ +8 % Max-HP im Kampf.',
  },
  {
    id:          'titel_blitz',
    name:        'Blitzkrieger',
    type:        'titel',
    emoji:       '⚡',
    preis:       90,
    beschreibung: 'Schneller als jedes Auge, gefürchtet von jedem Gegner. ⚔️ +8 % Angriff im Kampf.',
  },
  {
    id:          'titel_sturm',
    name:        'Sturmreiter',
    type:        'titel',
    emoji:       '🌪️',
    preis:       110,
    beschreibung: 'Unaufhaltsam wie ein Tornado durch die Arena. 🛡️ +8 % Ausweich-Chance im Kampf.',
  },
  {
    id:          'titel_schatten',
    name:        'Schattenläufer',
    type:        'titel',
    emoji:       '🌑',
    preis:       140,
    beschreibung: 'Aus den Schatten – unvorhersehbar und gefährlich. 🛡️ +10 % Ausweich-Chance im Kampf.',
  },
  {
    id:          'titel_drache',
    name:        'Drachentöter',
    type:        'titel',
    emoji:       '🐉',
    preis:       180,
    beschreibung: 'Kein Feind ist zu mächtig, kein Drache zu groß. ⚔️ +10 % Angriff im Kampf.',
  },
  {
    id:          'titel_koenig',
    name:        'König der Arena',
    type:        'titel',
    emoji:       '👑',
    preis:       350,
    beschreibung: 'Nur die Allerklärsten tragen diese Krone. ❤️ +10 % HP & ⚔️ +5 % Angriff im Kampf.',
  },
  {
    id:          'titel_legende',
    name:        'Legendärer Krieger',
    type:        'titel',
    emoji:       '⭐',
    preis:       600,
    beschreibung: 'Der höchste Ehrentitel des Kolosseums. ❤️ +12 % HP & ⚔️ +8 % Angriff im Kampf.',
  },

  // ── Einzugseffekte ─────────────────────────────────────────────────────────
  {
    id:          'effekt_feuer',
    name:        'Feuereinmarsch',
    type:        'effekt',
    emoji:       '🔥',
    preis:       200,
    beschreibung: 'Dein Gladiator betritt die Arena umhüllt von lodernden Flammen. ⚔️ +12 % Angriff im Kampf.',
  },
  {
    id:          'effekt_frost',
    name:        'Eissturm-Einzug',
    type:        'effekt',
    emoji:       '❄️',
    preis:       200,
    beschreibung: 'Eisige Aura – dein Gegner erfriert schon beim Anblick. ❤️ +15 % Max-HP im Kampf.',
  },
  {
    id:          'effekt_blitz',
    name:        'Blitzeinschlag',
    type:        'effekt',
    emoji:       '⚡',
    preis:       250,
    beschreibung: 'Donnernder Blitzeinschlag kündigt deinen Einzug an. ⚡ +15 % Kritisch-Treffer-Chance im Kampf.',
  },
];

module.exports = { SHOP_ITEMS };
