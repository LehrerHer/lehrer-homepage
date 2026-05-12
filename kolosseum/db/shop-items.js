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
    beschreibung: 'Für Gladiatoren, die ihren ersten Sieg errungen haben.',
  },
  {
    id:          'titel_loewe',
    name:        'Löwenherz',
    type:        'titel',
    emoji:       '🦁',
    preis:       60,
    beschreibung: 'Du trägst den Mut des Königs der Savanne.',
  },
  {
    id:          'titel_blitz',
    name:        'Blitzkrieger',
    type:        'titel',
    emoji:       '⚡',
    preis:       90,
    beschreibung: 'Schneller als jedes Auge, gefürchtet von jedem Gegner.',
  },
  {
    id:          'titel_sturm',
    name:        'Sturmreiter',
    type:        'titel',
    emoji:       '🌪️',
    preis:       110,
    beschreibung: 'Unaufhaltsam wie ein Tornado durch die Arena.',
  },
  {
    id:          'titel_schatten',
    name:        'Schattenläufer',
    type:        'titel',
    emoji:       '🌑',
    preis:       140,
    beschreibung: 'Aus den Schatten – unvorhersehbar und gefährlich.',
  },
  {
    id:          'titel_drache',
    name:        'Drachentöter',
    type:        'titel',
    emoji:       '🐉',
    preis:       180,
    beschreibung: 'Kein Feind ist zu mächtig, kein Drache zu groß.',
  },
  {
    id:          'titel_koenig',
    name:        'König der Arena',
    type:        'titel',
    emoji:       '👑',
    preis:       350,
    beschreibung: 'Nur die Allerklärsten tragen diese Krone.',
  },
  {
    id:          'titel_legende',
    name:        'Legendärer Krieger',
    type:        'titel',
    emoji:       '⭐',
    preis:       600,
    beschreibung: 'Der höchste Ehrentitel des Kolosseums.',
  },

  // ── Einzugseffekte ─────────────────────────────────────────────────────────
  {
    id:          'effekt_feuer',
    name:        'Feuereinmarsch',
    type:        'effekt',
    emoji:       '🔥',
    preis:       200,
    beschreibung: 'Dein Gladiator betritt die Arena umhüllt von lodernden Flammen.',
  },
  {
    id:          'effekt_frost',
    name:        'Eissturm-Einzug',
    type:        'effekt',
    emoji:       '❄️',
    preis:       200,
    beschreibung: 'Eisige Aura – dein Gegner erfriert schon beim Anblick.',
  },
  {
    id:          'effekt_blitz',
    name:        'Blitzeinschlag',
    type:        'effekt',
    emoji:       '⚡',
    preis:       250,
    beschreibung: 'Donnernder Blitzeinschlag kündigt deinen Einzug an.',
  },
];

module.exports = { SHOP_ITEMS };
