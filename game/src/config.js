// NEON VOID — tuning, palette and the upgrade pool.
// One place for every number a designer would tweak.

export const VIEW = { w: 1280, h: 720 };

export const PALETTE = {
  bg: '#070716',
  grid: 'rgba(90, 90, 220, 0.10)',
  player: '#00e5ff',
  playerCore: '#e8feff',
  bullet: '#ffe14d',
  enemyChaser: '#ff2e63',
  enemyShooter: '#ff9f1c',
  enemySplitter: '#b537f2',
  enemyMini: '#e07bff',
  enemyBoss: '#ff2244',
  orb: '#ff7b00',
  particle: '#7df9ff',
  text: '#e8ecff',
  dim: '#8a8fb5',
  danger: '#ff3355',
  heal: '#39ff88',
  gold: '#ffd166',
};

// Deterministic RNG (mulberry32) so staged screenshots look the same every run.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PLAYER_BASE = {
  radius: 16,
  speed: 330,
  maxHp: 100,
  fireInterval: 0.16,
  bulletSpeed: 720,
  bulletDamage: 22,
  bulletRadius: 5,
  dashCooldown: 2.2,
  dashSpeed: 950,
  dashTime: 0.16,
  pickupRadius: 90,
};

export const ENEMY_TYPES = {
  chaser:   { hp: 30,  speed: 120, radius: 16, score: 50,  color: PALETTE.enemyChaser,   shape: 'tri' },
  shooter:  { hp: 42,  speed: 82,  radius: 18, score: 80,  color: PALETTE.enemyShooter,  shape: 'diamond' },
  splitter: { hp: 60,  speed: 95,  radius: 22, score: 120, color: PALETTE.enemySplitter, shape: 'hex' },
  mini:     { hp: 14,  speed: 190, radius: 10, score: 25,  color: PALETTE.enemyMini,     shape: 'tri' },
  boss:     { hp: 900, speed: 62,  radius: 52, score: 1500, color: PALETTE.enemyBoss,    shape: 'boss' },
};

// How many of each type a wave fields, before the boss waves add a boss.
export function waveComposition(wave) {
  const n = (base, per) => Math.round(base + per * (wave - 1));
  return {
    chaser: n(5, 2.2),
    shooter: wave >= 2 ? n(1, 1.1) : 0,
    splitter: wave >= 3 ? n(0, 0.9) : 0,
    boss: wave % 5 === 0 ? 1 : 0,
  };
}

export const UPGRADES = [
  { id: 'damage',   name: 'OVERCHARGE',  desc: '+35% bullet damage',        apply: (p) => { p.damage *= 1.35; }, color: '#ff9f1c' },
  { id: 'firerate', name: 'RAPID CYCLER',desc: '+25% fire rate',            apply: (p) => { p.fireInterval *= 0.8; }, color: '#ffe14d' },
  { id: 'multishot',name: 'SPLIT ROUNDS',desc: '+1 projectile per shot',    apply: (p) => { p.shots += 1; }, color: '#00e5ff' },
  { id: 'pierce',   name: 'LANCE ROUNDS',desc: 'Bullets pierce +1 enemy',   apply: (p) => { p.pierce += 1; }, color: '#7df9ff' },
  { id: 'speed',    name: 'ION THRUSTERS',desc: '+18% move speed',          apply: (p) => { p.speed *= 1.18; }, color: '#39ff88' },
  { id: 'maxhp',    name: 'AEGIS PLATING',desc: '+30 max HP and heal 30',   apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); }, color: '#39ff88' },
  { id: 'magnet',   name: 'TRACTOR WEB', desc: '+80% pickup radius',       apply: (p) => { p.pickupRadius *= 1.8; }, color: '#b537f2' },
  { id: 'dash',     name: 'PHASE DASH',  desc: '-35% dash cooldown',        apply: (p) => { p.dashCooldown *= 0.65; }, color: '#e07bff' },
  { id: 'crit',     name: 'DEADEYE',     desc: '+12% critical chance',      apply: (p) => { p.crit += 0.12; }, color: '#ffd166' },
  { id: 'regen',    name: 'NANO WEAVE',  desc: 'Regenerate 1.5 HP / sec',   apply: (p) => { p.regen += 1.5; }, color: '#39ff88' },
];

export const COMBO_WINDOW = 2.5;   // seconds a kill keeps the combo alive
export const VICTORY_WAVE = 10;    // clear wave 10 (boss) to win; endless after
export const BEST_KEY = 'neon-void-best';
