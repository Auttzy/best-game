// NEON VOID — entry point: the loop, the phase machine, button clicks, and
// the deterministic staging scenes used for screenshots (?scene=title|play|
// upgrade|over|victory). The staging scenes run the game's own code: they set
// up real state and let the normal renderer draw it.

import { VIEW } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { newState, startGame, updatePlaying, updateTitle, applyUpgrade, beginWave, rollUpgrades, PHASE } from './world.js';
import { makeEnemy, makeFloatText, burst } from './entities.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sfx = new SoundBank();
input.onFirstGesture = () => sfx.ensure();

const state = newState(20261116);
const mouse = { x: VIEW.w / 2, y: VIEW.h / 2 };

function inRect(x, y, w, h) {
  return mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
}

// --- deterministic staging scenes for screenshots -------------------------
// ?scene=play seeds a busy mid-wave fight; ?scene=upgrade opens the card
// choice; ?scene=over / ?scene=victory show the end screens with a real score.
function stageScene(name) {
  if (name === 'title') {
    state.phase = PHASE.TITLE;
    state.best = 12840;
    return;
  }
  if (name === 'play') {
    startGame(state);
    state.wave = 3;
    state.waveState = 'fighting';
    state.score = 8420;
    state.best = 8420;
    state.kills = 47;
    state.combo = 9;
    state.comboTimer = 1.8;
    state.bestCombo = 12;
    state.player.hp = 76;
    state.player.invuln = 3; // spawn protection: keep the staged frame clean
    state.flashRed = 0;
    state.player.x = 560;
    state.player.y = 400;
    state.player.angle = 0.5;
    const spots = [
      ['chaser', 830, 220], ['chaser', 900, 480], ['shooter', 1020, 300],
      ['splitter', 700, 150], ['chaser', 420, 620], ['shooter', 300, 220],
      ['mini', 980, 560], ['mini', 640, 520],
      ['chaser', 700, 330], ['mini', 760, 470], ['shooter', 450, 330],
    ];
    for (const [type, x, y] of spots) state.enemies.push(makeEnemy(type, x, y, 3, state.rng));
    state.enemies[2].hp = state.enemies[2].maxHp * 0.4;
    // A slow fan of tracers from the ship, so the shot reads as a firefight.
    for (const off of [-0.18, -0.06, 0.06, 0.18]) {
      const a = state.player.angle + off;
      state.bullets.push(
        { x: 560 + Math.cos(a) * 22, y: 400 + Math.sin(a) * 22, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, radius: 5, damage: 22, pierce: 0, crit: false, friendly: true, dead: false, life: 3 },
      );
    }
    state.orbs.push({ x: 950, y: 330, vx: -200, vy: 60, radius: 7, damage: 10, pierce: 0, crit: false, friendly: false, dead: false, life: 1.5 });
    burst(state.particles, 860, 300, '#ff2e63', 26, 260, 0.7, 4);
    state.texts.push(makeFloatText(860, 270, '+120', '#ffe14d', 18));
    state.message = 'WAVE 3';
    state.messageTimer = 2;
    return;
  }
  if (name === 'upgrade') {
    startGame(state);
    state.wave = 2;
    state.score = 3150;
    state.best = 8420;
    state.kills = 22;
    state.player.hp = 88;
    rollUpgrades(state);
    return;
  }
  if (name === 'over') {
    startGame(state);
    state.score = 12840;
    state.kills = 83;
    state.bestCombo = 14;
    state.wave = 4;
    state.best = 12840;
    state.player.alive = false;
    state.phase = PHASE.OVER;
    burst(state.particles, 640, 360, '#00e5ff', 60, 300, 0.9, 4);
    return;
  }
  if (name === 'victory') {
    startGame(state);
    state.score = 41200;
    state.kills = 210;
    state.bestCombo = 23;
    state.wave = 10;
    state.best = 41200;
    state.phase = PHASE.VICTORY;
    return;
  }
}

const scene = new URLSearchParams(location.search).get('scene');
if (scene) stageScene(scene);

// --- phase machine ---------------------------------------------------------
function handleClick() {
  sfx.ensure();
  if (state.phase === PHASE.TITLE) {
    if (inRect(VIEW.w / 2 - 170, 420, 340, 64)) startGame(state);
    return;
  }
  if (state.phase === PHASE.UPGRADE) {
    const cw = 300, ch = 210, gap = 30;
    const x0 = (VIEW.w - cw * 3 - gap * 2) / 2;
    for (let i = 0; i < 3; i++) {
      if (inRect(x0 + i * (cw + gap), 220, cw, ch)) {
        sfx.upgrade();
        applyUpgrade(state, i);
        return;
      }
    }
    return;
  }
  if (state.phase === PHASE.PAUSED) {
    state.phase = state.prevPhase;
    return;
  }
  if (state.phase === PHASE.OVER || state.phase === PHASE.VICTORY) {
    if (inRect(VIEW.w / 2 - 170, 500, 340, 60)) startGame(state);
  }
}

function handleKeys() {
  if (input.wasPressed('m')) sfx.toggleMute();
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    if (state.phase === PHASE.PLAYING) {
      state.prevPhase = PHASE.PLAYING;
      state.phase = PHASE.PAUSED;
    } else if (state.phase === PHASE.PAUSED) {
      state.phase = state.prevPhase;
    } else if (state.phase === PHASE.OVER || state.phase === PHASE.VICTORY) {
      state.phase = PHASE.TITLE;
      state.enemies = [];
      state.particles = [];
      state.texts = [];
      state.player = state.player; // keep best score on the title screen
    }
  }
  if (input.wasPressed('r') && (state.phase === PHASE.OVER || state.phase === PHASE.VICTORY)) {
    startGame(state);
  }
  if (input.wasPressed('enter') && state.phase === PHASE.TITLE) {
    startGame(state);
  }
  if (state.phase === PHASE.UPGRADE) {
    if (input.wasPressed('1')) { sfx.upgrade(); applyUpgrade(state, 0); }
    if (input.wasPressed('2')) { sfx.upgrade(); applyUpgrade(state, 1); }
    if (input.wasPressed('3')) { sfx.upgrade(); applyUpgrade(state, 2); }
  }
}

// --- main loop -------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  mouse.x = input.mouseX;
  mouse.y = input.mouseY;

  handleKeys();
  if (input.consumeClick()) handleClick();

  if (state.phase === PHASE.TITLE) updateTitle(state, dt);
  else if (state.phase === PHASE.PLAYING) updatePlaying(state, input, dt, sfx);

  render(ctx, state, mouse);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose the state for headless play-testing (start, shoot, lose, restart).
window.__neonVoid = { state, startGame, PHASE };
