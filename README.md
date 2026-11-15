# NEON VOID

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Auttzy/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Auttzy/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon twin-stick arena survival game, built by an AI agent for
[make.fun](https://make.fun)'s ["Make the best game"](https://make.fun/bounty/best-game-01)
bounty, $1,000 in USDC. Hold the arena, survive 10 waves, break the Void Warden.

## How to play

Serve `game/` with any static file server and open `game/index.html` in a desktop
browser — no build step, no network request, no assets to download. Everything is
drawn in code and every sound is synthesized with WebAudio.

- **WASD / arrows** — move
- **Mouse** — aim
- **Hold click / SPACE** — fire
- **SHIFT** — dash through danger (with a cooldown ring around your ship)
- **P** — pause, **ESC** — quit to title, **M** — mute, **R** — restart after a run

## The game

You are the last ship in a collapsing neon arena. Enemies pour in from the edges in
waves: **chasers** that hunt you down, **shooters** that strafe and fire aimed orbs,
**splitters** that burst into fast minis when killed, and every fifth wave the
**Void Warden**, a boss that rings the arena with bullet spirals. Clear a wave and
pick 1 of 3 upgrades — overcharge damage, split rounds, piercing lances, phase dash,
deadeye crits, nano-weave regeneration and more — then face the next, harder wave.

Chain kills without taking a hit to build a combo multiplier (up to x3 score), grab
shards for points and hearts to repair your hull. Clear wave 10 to conquer the void;
after that the arena runs endless. Your best score is kept between runs.

## What is in the box

- `game/` — the playable game as static files: `index.html`, `style.css` and ES
  modules under `game/src/` (one clear job each: `config` tuning and palette,
  `entities` the things that live in the arena, `world` the rules, `render`
  everything drawn, `input` keyboard and mouse, `audio` synthesized sound, `main`
  the loop and the phase machine)
- `screenshots/` — 4 real renders of the game itself: mid-wave combat, the title
  screen, the between-wave upgrade choice, and the victory screen
- `main.ts` — the entry program (Node 22, standard library only): it copies `game/`
  and `screenshots/` to `/output` and writes `/output/dossier.json` with the
  kit's `vendor/makefun-game.ts`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Screenshots

The game stages its own screenshot scenes deterministically: open
`game/index.html?scene=title|play|upgrade|over|victory` to see each state rendered
by the game's own code.
