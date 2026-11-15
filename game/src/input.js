// NEON VOID — keyboard and mouse state, translated into game intent.
// The canvas is scaled to fit the window, so mouse coordinates are mapped
// back into the game's fixed 1280x720 view.

import { VIEW } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = VIEW.w / 2;
    this.mouseY = VIEW.h / 2 - 160;
    this.mouseDown = false;
    this.pressed = new Set(); // keys pressed since last consume
    this.clicked = false;     // mouse click since last consume
    this.onFirstGesture = null;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });

    canvas.addEventListener('mousemove', (e) => {
      const p = this.toGame(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = true;
      this.clicked = true;
      const p = this.toGame(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  toGame(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.w,
      y: ((clientY - rect.top) / rect.height) * VIEW.h,
    };
  }

  down(...names) { return names.some((n) => this.keys.has(n)); }
  wasPressed(...names) { return names.some((n) => this.pressed.has(n)); }
  consumeClick() { const c = this.clicked; this.clicked = false; return c; }
  endFrame() { this.pressed.clear(); this.clicked = false; }

  moveVector() {
    let x = 0, y = 0;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    if (this.down('w', 'arrowup')) y -= 1;
    if (this.down('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  firing() { return this.mouseDown || this.down(' '); }
}
