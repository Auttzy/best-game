// NEON VOID — the rules: waves, spawning, movement, collisions, scoring,
// combos, pickups, upgrades and the win/lose conditions. Render.js only draws
// what this module keeps in `state`.

import {
  BEST_KEY, COMBO_WINDOW, ENEMY_TYPES, UPGRADES, VICTORY_WAVE, VIEW,
  makeRng, waveComposition,
} from './config.js';
import {
  burst, makeBullet, makeEnemy, makeFloatText, makePickup, makePlayer, ringBurst,
} from './entities.js';

export const PHASE = {
  TITLE: 'title',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  PAUSED: 'paused',
  OVER: 'over',
  VICTORY: 'victory',
};

export function newState(seed) {
  return {
    phase: PHASE.TITLE,
    prevPhase: PHASE.PLAYING,
    time: 0,
    rng: makeRng(seed || (Math.random() * 1e9) | 0),
    player: makePlayer(),
    enemies: [],
    bullets: [],
    orbs: [],
    pickups: [],
    particles: [],
    texts: [],
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    waveState: 'idle', // 'idle' | 'spawning' | 'fighting' | 'clear'
    waveClearTimer: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    shake: 0,
    flashRed: 0,
    upgradeChoices: [],
    upgradePicked: -1,
    won: false,
    stats: { shots: 0, hits: 0 },
    message: '',
    messageTimer: 0,
  };
}

export function startGame(state, keepScore) {
  const best = state.best;
  const fresh = newState((Math.random() * 1e9) | 0);
  Object.assign(state, fresh);
  state.best = best;
  if (keepScore) state.score = 0;
  state.phase = PHASE.PLAYING;
  state.waveState = 'idle';
  state.waveClearTimer = 0.6;
  state.message = 'WAVE 1 INCOMING';
  state.messageTimer = 1.6;
}

function pickSpawnPoint(state) {
  const { rng } = state;
  const margin = 60;
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: -margin, y: rng() * VIEW.h };
  if (side === 1) return { x: VIEW.w + margin, y: rng() * VIEW.h };
  if (side === 2) return { x: rng() * VIEW.w, y: -margin };
  return { x: rng() * VIEW.w, y: VIEW.h + margin };
}

export function beginWave(state) {
  state.wave += 1;
  const comp = waveComposition(state.wave);
  const queue = [];
  const push = (type, n) => { for (let i = 0; i < n; i++) queue.push(type); };
  push('chaser', comp.chaser);
  push('shooter', comp.shooter);
  push('splitter', comp.splitter);
  push('boss', comp.boss);
  // Shuffle so the trickle is mixed.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  state.spawnQueue = queue;
  state.spawnTimer = 0.4;
  state.waveState = 'spawning';
  state.message = state.wave % 5 === 0
    ? `WAVE ${state.wave} — VOID WARDEN APPROACHES`
    : `WAVE ${state.wave}`;
  state.messageTimer = 2;
  return comp.boss > 0;
}

export function rollUpgrades(state) {
  const pool = [...UPGRADES];
  const picks = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(state.rng() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  state.upgradeChoices = picks;
  state.upgradePicked = -1;
  state.message = '';
  state.messageTimer = 0;
  state.phase = PHASE.UPGRADE;
}

export function applyUpgrade(state, index) {
  const up = state.upgradeChoices[index];
  if (!up) return;
  up.apply(state.player);
  state.upgradePicked = index;
  state.texts.push(makeFloatText(640, 300, up.name + ' ACQUIRED', up.color, 26));
  state.phase = PHASE.PLAYING;
  state.waveState = 'idle';
  state.waveClearTimer = 1.0;
}

function firePlayerBullet(state) {
  const p = state.player;
  const spread = 0.09;
  const n = p.shots;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * spread;
    const a = p.angle + off;
    const crit = state.rng() < p.crit;
    state.bullets.push(makeBullet(
      p.x + Math.cos(a) * (p.radius + 6),
      p.y + Math.sin(a) * (p.radius + 6),
      a, p.bulletSpeed, p.damage * (crit ? 2 : 1), p.pierce, crit, true,
    ));
  }
  state.stats.shots += n;
}

function killEnemy(state, enemy, awardScore) {
  enemy.dead = true;
  state.kills += 1;
  burst(state.particles, enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 90 : 22, 260, 0.7, 4);
  ringBurst(state.particles, enemy.x, enemy.y, '#ffffff', enemy.type === 'boss' ? 24 : 8, 320, 0.4, 3);
  state.shake = Math.max(state.shake, enemy.type === 'boss' ? 22 : 7);

  if (enemy.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const mini = makeEnemy('mini', enemy.x + (state.rng() - 0.5) * 30, enemy.y + (state.rng() - 0.5) * 30, state.wave, state.rng);
      state.enemies.push(mini);
    }
  }
  // Shards drop: score pickups, and a rare heal.
  const drops = enemy.type === 'boss' ? 8 : state.rng() < 0.55 ? 1 : 0;
  for (let i = 0; i < drops; i++) {
    state.pickups.push(makePickup(enemy.x, enemy.y, 'shard', state.rng));
  }
  if (state.rng() < 0.08) state.pickups.push(makePickup(enemy.x, enemy.y, 'heart', state.rng));

  if (awardScore) {
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const mult = 1 + Math.min(state.combo, 20) * 0.1;
    const gained = Math.round(enemy.score * mult);
    state.score += gained;
    state.texts.push(makeFloatText(enemy.x, enemy.y - enemy.radius, `+${gained}`, '#ffe14d', enemy.type === 'boss' ? 30 : 16));
    if (state.combo >= 5 && state.combo % 5 === 0) {
      state.texts.push(makeFloatText(640, 250, `COMBO x${state.combo}!`, '#ff9f1c', 28));
    }
  }
}

function damagePlayer(state, amount, sx, sy) {
  const p = state.player;
  if (p.invuln > 0 || p.dashTime > 0 || !p.alive) return;
  p.hp -= amount;
  p.invuln = 0.8;
  state.flashRed = 0.45;
  state.shake = Math.max(state.shake, 12);
  state.combo = 0;
  state.comboTimer = 0;
  burst(state.particles, p.x, p.y, '#ff3355', 18, 240, 0.6, 4);
  state.texts.push(makeFloatText(p.x, p.y - 30, `-${amount}`, '#ff3355', 20));
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    burst(state.particles, p.x, p.y, '#00e5ff', 120, 420, 1.1, 5);
    ringBurst(state.particles, p.x, p.y, '#ffffff', 28, 520, 0.7, 3);
    state.shake = 26;
    state.phase = PHASE.OVER;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(BEST_KEY, String(state.best));
    }
  }
}

function updatePlayer(state, input, dt, sfx) {
  const p = state.player;
  if (!p.alive) return;
  const mv = input.moveVector();
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  p.dashTimer = Math.max(0, p.dashTimer - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  if (input.wasPressed('shift') && p.dashTimer <= 0 && (mv.x !== 0 || mv.y !== 0)) {
    p.dashTime = 0.16;
    p.dashTimer = p.dashCooldown;
    const len = Math.hypot(mv.x, mv.y) || 1;
    p.dashX = mv.x / len;
    p.dashY = mv.y / len;
    sfx.dash();
    burst(state.particles, p.x, p.y, '#00e5ff', 10, 160, 0.4, 3);
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashX * 950 * dt;
    p.y += p.dashY * 950 * dt;
  } else {
    p.vx = mv.x * p.speed;
    p.vy = mv.y * p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  p.x = Math.max(p.radius, Math.min(VIEW.w - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(VIEW.h - p.radius, p.y));

  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    firePlayerBullet(state);
    p.fireTimer = p.fireInterval;
    sfx.shoot();
  }
}

function updateEnemies(state, dt, sfx) {
  const p = state.player;
  for (const e of state.enemies) {
    e.flash = Math.max(0, e.flash - dt * 6);
    e.wobble += dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    if (e.type === 'shooter') {
      // Keep a mid range, strafe, and fire aimed orbs.
      const want = 300;
      const radial = dist > want + 40 ? 1 : dist < want - 40 ? -0.6 : 0;
      const strafe = Math.sin(e.wobble * 0.7) * 0.8;
      e.x += (ux * radial + -uy * strafe) * e.speed * dt;
      e.y += (uy * radial + ux * strafe) * e.speed * dt;
      e.angle = Math.atan2(dy, dx);
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && p.alive && dist < 560) {
        e.shootTimer = 2.4;
        state.orbs.push(makeBullet(e.x, e.y, e.angle, 260, 10, 0, false, false));
        sfx.hit();
      }
    } else if (e.type === 'boss') {
      e.x += ux * e.speed * dt;
      e.y += uy * e.speed * dt;
      e.angle += dt * 0.6;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && p.alive) {
        e.shootTimer = 1.7;
        const base = Math.atan2(dy, dx);
        for (let i = 0; i < 10; i++) {
          const a = base + (i / 10) * Math.PI * 2;
          state.orbs.push(makeBullet(e.x, e.y, a, 190, 12, 0, false, false));
        }
        sfx.bossAlarm();
      }
    } else {
      // Chasers, splitters and minis home in, with a slight wobble.
      const wob = Math.sin(e.wobble * 2.2) * 0.35;
      const ax = ux + -uy * wob;
      const ay = uy + ux * wob;
      const len = Math.hypot(ax, ay) || 1;
      e.x += (ax / len) * e.speed * dt;
      e.y += (ay / len) * e.speed * dt;
      e.angle = Math.atan2(ay, ax);
    }

    // Touch damage.
    if (p.alive && dist < e.radius + p.radius - 2) {
      damagePlayer(state, e.touchDamage, e.x, e.y);
      // Knock the enemy back so it does not chew through HP in one frame.
      e.x -= ux * 26;
      e.y -= uy * 26;
    }
  }
}

function updateBullets(state, dt, sfx) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW.w + 20 || b.y < -20 || b.y > VIEW.h + 20) {
      b.dead = true;
      continue;
    }
    for (const e of state.enemies) {
      if (e.dead) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.radius + b.radius) * (e.radius + b.radius)) {
        e.hp -= b.damage;
        e.flash = 1;
        state.stats.hits += 1;
        burst(state.particles, b.x, b.y, '#ffe14d', 4, 140, 0.3, 3);
        if (b.crit) state.texts.push(makeFloatText(e.x, e.y - e.radius - 8, 'CRIT', '#ff9f1c', 15));
        if (e.hp <= 0) killEnemy(state, e, true);
        else sfx.hit();
        if (b.pierce > 0) { b.pierce -= 1; }
        else { b.dead = true; }
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead);
  state.enemies = state.enemies.filter((e) => !e.dead);

  for (const o of state.orbs) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0 || o.x < -30 || o.x > VIEW.w + 30 || o.y < -30 || o.y > VIEW.h + 30) {
      o.dead = true;
      continue;
    }
    const p = state.player;
    if (p.alive) {
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      if (dx * dx + dy * dy < (p.radius + o.radius - 2) * (p.radius + o.radius - 2)) {
        o.dead = true;
        damagePlayer(state, o.damage, o.x, o.y);
        sfx.playerHit();
      }
    }
  }
  state.orbs = state.orbs.filter((o) => !o.dead);
}

function updatePickups(state, dt) {
  const p = state.player;
  for (const pk of state.pickups) {
    pk.life -= dt;
    pk.bob += dt * 4;
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    pk.vx *= 0.98;
    pk.vy *= 0.98;
    if (pk.life <= 0) { pk.dead = true; continue; }
    if (!p.alive) continue;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < p.pickupRadius) {
      pk.x += (dx / dist) * 420 * dt;
      pk.y += (dy / dist) * 420 * dt;
    }
    if (dist < p.radius + pk.radius + 2) {
      pk.dead = true;
      if (pk.kind === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + pk.value);
        state.texts.push(makeFloatText(p.x, p.y - 28, `+${pk.value} HP`, '#39ff88', 16));
      } else {
        state.score += pk.value;
        state.texts.push(makeFloatText(pk.x, pk.y - 10, `+${pk.value}`, '#7df9ff', 13));
      }
    }
  }
  state.pickups = state.pickups.filter((pk) => !pk.dead);
}

function updateFx(state, dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const t of state.texts) {
    t.y -= 42 * dt;
    t.life -= dt;
  }
  state.texts = state.texts.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 34);
  state.flashRed = Math.max(0, state.flashRed - dt);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
}

function updateWaves(state, dt, sfx) {
  if (state.waveState === 'idle') {
    state.waveClearTimer -= dt;
    if (state.waveClearTimer <= 0) {
      const boss = beginWave(state);
      if (boss) sfx.bossAlarm();
      else sfx.waveStart();
    }
    return;
  }
  if (state.waveState === 'spawning') {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      const type = state.spawnQueue.shift();
      const pos = pickSpawnPoint(state);
      state.enemies.push(makeEnemy(type, pos.x, pos.y, state.wave, state.rng));
      state.spawnTimer = state.spawnQueue.length > 0 ? 0.28 : 0;
      if (state.spawnQueue.length === 0) state.waveState = 'fighting';
    }
    return;
  }
  if (state.waveState === 'fighting' && state.enemies.length === 0 && state.player.alive) {
    state.waveState = 'clear';
    if (state.wave >= VICTORY_WAVE && !state.won) {
      state.won = true;
      state.phase = PHASE.VICTORY;
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem(BEST_KEY, String(state.best));
      }
      sfx.victory();
      return;
    }
    state.score += 100 * state.wave;
    state.texts.push(makeFloatText(640, 260, `WAVE ${state.wave} CLEAR  +${100 * state.wave}`, '#39ff88', 24));
    sfx.upgrade();
    rollUpgrades(state);
  }
}

// One fixed-step update of the playing state.
export function updatePlaying(state, input, dt, sfx) {
  state.time += dt;
  updatePlayer(state, input, dt, sfx);
  if (state.phase !== PHASE.PLAYING) return; // player died this frame
  updateEnemies(state, dt, sfx);
  if (state.phase !== PHASE.PLAYING) return;
  updateBullets(state, dt, sfx);
  updatePickups(state, dt);
  updateFx(state, dt);
  updateWaves(state, dt, sfx);
}

// Title-screen ambience: a few enemies drift across the backdrop.
export function updateTitle(state, dt) {
  state.time += dt;
  if (state.enemies.length < 7 && state.rng() < dt * 0.8) {
    const type = ['chaser', 'shooter', 'splitter'][Math.floor(state.rng() * 3)];
    const pos = pickSpawnPoint(state);
    const e = makeEnemy(type, pos.x, pos.y, 1, state.rng);
    e.speed *= 0.5;
    state.enemies.push(e);
  }
  for (const e of state.enemies) {
    e.x += Math.cos(e.angle) * e.speed * dt;
    e.y += Math.sin(e.angle) * e.speed * dt;
    e.angle += dt * 0.3;
    if (e.x < -80 || e.x > VIEW.w + 80 || e.y < -80 || e.y > VIEW.h + 80) e.dead = true;
  }
  state.enemies = state.enemies.filter((e) => !e.dead);
  updateFx(state, dt);
}
