// NEON VOID — all sound is synthesized with WebAudio: no audio files.
// Short oscillator blips for effects, and a quiet bass arpeggio loop for music.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
  }

  // Browsers require a user gesture before audio starts; call from any click/key.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.10;
    this.musicGain.connect(this.master);
    this.startMusic();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  shoot() { this.blip(880, 0.07, 'square', 0.10, 320); }
  hit() { this.blip(220, 0.05, 'sawtooth', 0.10, 140); }
  explode() { this.noise(0.35, 0.35, 900); this.blip(160, 0.3, 'sine', 0.25, 40); }
  playerHit() { this.noise(0.2, 0.3, 700); this.blip(110, 0.25, 'sawtooth', 0.22, 55); }
  dash() { this.noise(0.14, 0.14, 2400); }
  pickup() { this.blip(660, 0.08, 'sine', 0.16, 990); }
  upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.18), i * 70)); }
  waveStart() { this.blip(440, 0.12, 'square', 0.14, 660); this.blip(660, 0.18, 'square', 0.12, 880); }
  bossAlarm() { [220, 220, 175].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'sawtooth', 0.2), i * 160)); }
  gameOver() { [392, 311, 233, 175].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.2), i * 180)); }
  victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.2), i * 110)); }

  // A slow minor-key bass walk, one note every 240 ms, quiet under the action.
  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const scale = [55, 55, 65.41, 49, 55, 82.41, 73.42, 65.41];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = scale[this.step % scale.length];
      this.step += 1;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.55);
    }, 240);
  }
}
