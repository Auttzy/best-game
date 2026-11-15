// NEON VOID — everything drawn: arena backdrop, entities, HUD, and every
// menu screen (title, upgrade choice, pause, game over, victory).

import { PALETTE, VICTORY_WAVE, VIEW } from './config.js';
import { PHASE } from './world.js';

function drawBackground(ctx, time) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // Slow starfield.
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const x = (i * 173.3 + time * 6) % VIEW.w;
    const y = (i * 97.7) % VIEW.h;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(time * 0.7 + i));
    ctx.globalAlpha = 0.25 * tw;
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  // Perspective grid.
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  const step = 64;
  ctx.beginPath();
  for (let x = 0; x <= VIEW.w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.h); }
  for (let y = 0; y <= VIEW.h; y += step) { ctx.moveTo(0, y); ctx.lineTo(VIEW.w, y); }
  ctx.stroke();

  // Soft vignette.
  const grad = ctx.createRadialGradient(640, 360, 300, 640, 360, 760);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,10,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function shapePath(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'tri') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  } else if (shape === 'diamond') {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0);
  } else if (shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  } else { // boss: spiked ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.62;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
  shapePath(ctx, e.shape, e.radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Inner eye / core.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(0, 0, e.radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(e.radius * 0.14, 0, e.radius * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Boss HP bar.
  if (e.type === 'boss') {
    const w = 130;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 26, w, 9);
    ctx.fillStyle = PALETTE.enemyBoss;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 26, w * Math.max(0, e.hp / e.maxHp), 9);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(e.x - w / 2, e.y - e.radius - 26, w, 9);
    ctx.fillStyle = '#ffd7de';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VOID WARDEN', e.x, e.y - e.radius - 34);
  } else if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}

function drawPlayer(ctx, p, time) {
  if (!p.alive) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  const blink = p.invuln > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  // Engine glow.
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 22;
  ctx.rotate(p.angle);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -13);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, -6);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Dash cooldown ring.
  if (p.dashTimer > 0) {
    const frac = 1 - p.dashTimer / p.dashCooldown;
    ctx.strokeStyle = 'rgba(0,229,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets(ctx, bullets, orbs) {
  for (const b of bullets) {
    ctx.save();
    ctx.shadowColor = PALETTE.bullet;
    ctx.shadowBlur = 12;
    ctx.fillStyle = b.crit ? '#ff9f1c' : PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const o of orbs) {
    ctx.save();
    ctx.shadowColor = PALETTE.orb;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.orb;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPickups(ctx, pickups, time) {
  for (const pk of pickups) {
    const bob = Math.sin(pk.bob) * 2;
    const fade = pk.life < 3 ? (Math.floor(time * 8) % 2 === 0 ? 0.4 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'heart') {
      ctx.shadowColor = PALETTE.heal;
      ctx.shadowBlur = 14;
      ctx.fillStyle = PALETTE.heal;
      ctx.beginPath();
      ctx.arc(-4, -2, 5, 0, Math.PI * 2);
      ctx.arc(4, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, -1);
      ctx.lineTo(8, -1);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.shadowColor = PALETTE.particle;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#aef7ff';
      ctx.rotate(time * 2 + pk.bob);
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();
  }
}

function drawParticles(ctx, particles) {
  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, texts) {
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.font = `bold ${t.size}px "Segoe UI", sans-serif`;
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 8;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawHud(ctx, state) {
  const p = state.player;
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 10;
  ctx.fillText(`SCORE  ${state.score.toLocaleString('en-US')}`, 24, 40);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST  ${state.best.toLocaleString('en-US')}`, 24, 64);
  ctx.fillText(`WAVE  ${Math.max(1, state.wave)}  /  ${state.waveState === 'idle' ? 'NEXT INCOMING' : state.enemies.length + state.spawnQueue.length + ' HOSTILES'}`, 24, 88);

  // HP bar.
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillText('HULL', 24, 116);
  bar(ctx, 76, 104, 220, 16, p.hp / p.maxHp, p.hp / p.maxHp > 0.35 ? PALETTE.heal : PALETTE.danger);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 304, 117);

  // Dash readiness.
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('DASH', 24, 144);
  bar(ctx, 76, 132, 220, 8, 1 - p.dashTimer / p.dashCooldown, PALETTE.player);

  // Combo, top right.
  ctx.textAlign = 'right';
  if (state.combo >= 2) {
    const mult = (1 + Math.min(state.combo, 20) * 0.1).toFixed(1);
    ctx.font = 'bold 30px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff9f1c';
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 12;
    ctx.fillText(`COMBO x${state.combo}`, VIEW.w - 24, 44);
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`SCORE x${mult}  —  ${state.comboTimer.toFixed(1)}s`, VIEW.w - 24, 68);
    ctx.shadowBlur = 0;
  }
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`KILLS ${state.kills}   •   ACC ${state.stats.shots ? Math.round(100 * state.stats.hits / state.stats.shots) + '%' : '—'}`, VIEW.w - 24, 96);
  ctx.fillText('P pause   •   M mute', VIEW.w - 24, 118);

  // Wave banner.
  if (state.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, state.messageTimer);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#b537f2';
    ctx.shadowBlur = 18;
    ctx.fillText(state.message, VIEW.w / 2, 190);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Low-HP warning.
  if (p.hp > 0 && p.hp / p.maxHp <= 0.3) {
    const pulse = 0.10 + 0.08 * Math.sin(state.time * 6);
    ctx.fillStyle = `rgba(255, 51, 85, ${pulse})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 8, 28, 0.88)';
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function button(ctx, x, y, w, h, label, hot) {
  ctx.fillStyle = hot ? 'rgba(0, 229, 255, 0.25)' : 'rgba(0, 229, 255, 0.10)';
  ctx.strokeStyle = hot ? '#00e5ff' : 'rgba(0, 229, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8feff';
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 7);
}

export function drawTitle(ctx, state, mouse) {
  drawBackground(ctx, state.time);
  for (const e of state.enemies) drawEnemy(ctx, e);
  drawParticles(ctx, state.particles);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 92px "Segoe UI", sans-serif';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 34;
  ctx.fillText('NEON VOID', VIEW.w / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff2e63';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillText('— ARENA SURVIVAL —', VIEW.w / 2, 252);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px "Segoe UI", sans-serif';
  ctx.fillText('Hold the arena. Survive 10 waves. Break the Void Warden.', VIEW.w / 2, 300);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillText('WASD / arrows — move      Mouse — aim      Hold click / SPACE — fire', VIEW.w / 2, 330);
  ctx.fillText('SHIFT — dash through danger      P — pause      M — mute', VIEW.w / 2, 356);
  ctx.fillText('Between waves, pick 1 of 3 upgrades. Chain kills for combo score.', VIEW.w / 2, 382);

  const bx = VIEW.w / 2 - 170;
  const by = 420;
  const hot = mouse.x >= bx && mouse.x <= bx + 340 && mouse.y >= by && mouse.y <= by + 64;
  button(ctx, bx, by, 340, 64, '▶  ENTER THE VOID', hot);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.fillText(`BEST SCORE  ${state.best.toLocaleString('en-US')}`, VIEW.w / 2, 522);
  ctx.fillText('An original game — no assets, no network, everything drawn and played live.', VIEW.w / 2, 548);
}

export function drawUpgrade(ctx, state, mouse) {
  ctx.fillStyle = 'rgba(4, 4, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#39ff88';
  ctx.font = 'bold 40px "Segoe UI", sans-serif';
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = 16;
  ctx.fillText(`WAVE ${state.wave} CLEAR`, VIEW.w / 2, 130);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillText('CHOOSE AN UPGRADE  —  click a card or press 1 / 2 / 3', VIEW.w / 2, 172);

  const cw = 300, ch = 210, gap = 30;
  const total = cw * 3 + gap * 2;
  const x0 = (VIEW.w - total) / 2;
  const y0 = 220;
  state.upgradeChoices.forEach((up, i) => {
    const x = x0 + i * (cw + gap);
    const hot = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y0 && mouse.y <= y0 + ch;
    ctx.save();
    ctx.fillStyle = hot ? 'rgba(20, 20, 50, 0.95)' : 'rgba(10, 10, 30, 0.92)';
    ctx.strokeStyle = hot ? up.color : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = hot ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y0, cw, ch, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = up.color;
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y0 + 30);
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillText(up.name, x + cw / 2, y0 + 76);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px "Segoe UI", sans-serif';
    ctx.fillText(up.desc, x + cw / 2, y0 + 118);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(hot ? 'CLICK TO TAKE' : '', x + cw / 2, y0 + 168);
    ctx.restore();
  });

  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.fillText(`Score ${state.score.toLocaleString('en-US')}   •   Hull ${Math.ceil(state.player.hp)} / ${state.player.maxHp}   •   Next: wave ${state.wave + 1}`, VIEW.w / 2, 480);
}

export function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(4, 4, 16, 0.7)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 54px "Segoe UI", sans-serif';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 20;
  ctx.fillText('PAUSED', VIEW.w / 2, 320);
  ctx.shadowBlur = 0;
  ctx.font = '18px "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Press P or click to resume — ESC quits to title', VIEW.w / 2, 360);
}

function drawEndScreen(ctx, state, mouse, title, titleColor, sub) {
  ctx.fillStyle = 'rgba(4, 4, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 64px "Segoe UI", sans-serif';
  ctx.shadowColor = titleColor;
  ctx.shadowBlur = 26;
  ctx.fillText(title, VIEW.w / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillText(sub, VIEW.w / 2, 232);

  panel(ctx, VIEW.w / 2 - 260, 270, 520, 190);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.fillText('FINAL SCORE', VIEW.w / 2, 306);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 46px "Segoe UI", sans-serif';
  ctx.fillText(state.score.toLocaleString('en-US'), VIEW.w / 2, 356);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '17px "Segoe UI", sans-serif';
  ctx.fillText(`Waves cleared ${state.wave - (state.phase === PHASE.OVER ? 1 : 0)}   •   Kills ${state.kills}   •   Best combo x${state.bestCombo}`, VIEW.w / 2, 398);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.fillText(`Best score ${state.best.toLocaleString('en-US')}`, VIEW.w / 2, 428);

  const bx = VIEW.w / 2 - 170;
  const by = 500;
  const hot = mouse.x >= bx && mouse.x <= bx + 340 && mouse.y >= by && mouse.y <= by + 60;
  button(ctx, bx, by, 340, 60, '↻  PLAY AGAIN  (R)', hot);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.fillText('Press R or click the button — ESC returns to the title screen', VIEW.w / 2, 596);
}

export function drawGameOver(ctx, state, mouse) {
  drawEndScreen(ctx, state, mouse, 'SIGNAL LOST', '#ff3355', 'Your ship broke apart in the void. The arena remembers your score.');
}

export function drawVictory(ctx, state, mouse) {
  drawEndScreen(ctx, state, mouse, 'VOID CONQUERED', '#39ff88', `You broke the Void Warden on wave ${VICTORY_WAVE}. The arena is yours — keep playing endless.`);
}

export function render(ctx, state, mouse) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground(ctx, state.time);
  for (const pk of state.pickups) { /* drawn below with bob */ }
  drawPickups(ctx, state.pickups, state.time);
  for (const e of state.enemies) drawEnemy(ctx, e);
  drawPlayer(ctx, state.player, state.time);
  drawBullets(ctx, state.bullets, state.orbs);
  drawParticles(ctx, state.particles);
  drawTexts(ctx, state.texts);
  ctx.restore();

  if (state.phase === PHASE.PLAYING || state.phase === PHASE.PAUSED || state.phase === PHASE.UPGRADE) {
    drawHud(ctx, state);
  }
  if (state.flashRed > 0) {
    ctx.fillStyle = `rgba(255, 30, 60, ${state.flashRed * 0.35})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
  if (state.phase === PHASE.TITLE) drawTitle(ctx, state, mouse);
  if (state.phase === PHASE.UPGRADE) drawUpgrade(ctx, state, mouse);
  if (state.phase === PHASE.PAUSED) drawPaused(ctx, state);
  if (state.phase === PHASE.OVER) drawGameOver(ctx, state, mouse);
  if (state.phase === PHASE.VICTORY) drawVictory(ctx, state, mouse);
}
