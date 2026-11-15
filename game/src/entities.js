// NEON VOID — the things that live in the arena: player, enemies, bullets,
// enemy orbs, pickups, particles and floating score text. Pure data + motion;
// rules (damage, spawning, scoring) live in world.js.

import { ENEMY_TYPES, PALETTE, PLAYER_BASE } from './config.js';

export function makePlayer() {
  return {
    x: 640, y: 360,
    vx: 0, vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER_BASE.radius,
    hp: PLAYER_BASE.maxHp,
    maxHp: PLAYER_BASE.maxHp,
    speed: PLAYER_BASE.speed,
    fireInterval: PLAYER_BASE.fireInterval,
    fireTimer: 0,
    damage: PLAYER_BASE.bulletDamage,
    bulletSpeed: PLAYER_BASE.bulletSpeed,
    shots: 1,
    pierce: 0,
    crit: 0.05,
    regen: 0,
    pickupRadius: PLAYER_BASE.pickupRadius,
    dashCooldown: PLAYER_BASE.dashCooldown,
    dashTimer: 0,
    dashTime: 0,
    dashX: 0, dashY: 0,
    invuln: 0,
    alive: true,
  };
}

let enemyId = 0;
export function makeEnemy(type, x, y, wave, rng) {
  const t = ENEMY_TYPES[type];
  const hpScale = 1 + (wave - 1) * 0.16;
  const speedScale = 1 + Math.min(0.5, (wave - 1) * 0.03);
  return {
    id: enemyId++,
    type, x, y,
    vx: 0, vy: 0,
    hp: t.hp * hpScale,
    maxHp: t.hp * hpScale,
    speed: t.speed * speedScale * (0.9 + rng() * 0.2),
    radius: t.radius,
    score: t.score,
    color: t.color,
    shape: t.shape,
    angle: rng() * Math.PI * 2,
    shootTimer: 1.5 + rng() * 1.5,
    wobble: rng() * Math.PI * 2,
    flash: 0,
    touchDamage: type === 'boss' ? 25 : 12,
  };
}

export function makeBullet(x, y, angle, speed, damage, pierce, crit, friendly) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: friendly ? 5 : 7,
    damage, pierce, crit,
    friendly,
    dead: false,
    life: 1.6,
  };
}

export function makePickup(x, y, kind, rng) {
  return {
    x, y,
    kind, // 'shard' (score) or 'heart' (heal)
    vx: (rng() - 0.5) * 60,
    vy: (rng() - 0.5) * 60,
    radius: kind === 'heart' ? 11 : 7,
    value: kind === 'heart' ? 18 : 25,
    life: 12,
    bob: rng() * Math.PI * 2,
  };
}

export function makeParticle(x, y, color, count, speed, life, size) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    parts.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      life: life * (0.5 + Math.random() * 0.5),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
    });
  }
  return parts;
}

export function makeFloatText(x, y, text, color, size) {
  return { x, y, text, color, size: size || 16, life: 0.9, maxLife: 0.9 };
}

export function burst(particles, x, y, color, count, speed, life, size) {
  particles.push(...makeParticle(x, y, color, count, speed, life, size));
}

export function ringBurst(particles, x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      color, life, maxLife: life,
      size: size * (0.7 + Math.random() * 0.6),
    });
  }
}

export { PALETTE };
