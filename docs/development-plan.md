# Browser-Based 2D Pseudo-3D Shooter: Development Plan

## Vision and Scope
- **Working title:** "Garo's First Encounter" – browser-only shooter inspired by Serious Sam.
- **Goal:** Ship a single HTML/JS bundle with three themed levels, wave-based combat, and a climactic boss fight.
- **Constraints:** Vanilla HTML5 Canvas, CSS, and JavaScript (no external libs), offline-capable, runs at ~60 FPS on modern browsers.

## Core Pillars
- **Pseudo-3D immersion:** Distance-based sprite scaling, billboarding, horizon/floor cues, optional fog, and screen shake on heavy impacts.
- **Relentless combat:** Mixed enemy archetypes (rushers, chargers, artillery, aerial), crowd-control weapons, and short breathers between waves.
- **Readable feedback:** Distinct sounds per enemy/weapon, snappy muzzle flashes/explosions, HUD clarity for health/armor/ammo/wave.
- **Level personality:** Three arenas with unique lighting/props/music; simple intro/outro splash transitions per level.

## Architecture
- **Entry point (`index.html`):** Canvas container, HUD overlays, start/pause/game-over panels, fullscreen toggle.
- **Styling (`style.css`):** Full-viewport canvas, responsive HUD placement, retro/industrial typography, cursor styles for crosshair states.
- **Engine (`script.js`):**
  - Game loop via `requestAnimationFrame`, delta-timed movement, layered canvases (background/action/UI) to minimize redraws.
  - Input manager (WASD, mouse aim with pointer lock, number keys + wheel for weapon swap, ESC pause, F fullscreen).
  - Asset loader for spritesheets/audio buffers; sprite animator; sound mixer using Web Audio with basic panning/ducking.
  - Core systems: entity/component primitives, collision (AABB/circles), projectile handling, particle system, camera/projection helpers.
  - State machines: menu → level intro → wave combat → level outro → next level; pause overlay and game-over restart.
  - Performance levers: culling offscreen actors, particle caps, pooled objects, offscreen canvas for static backgrounds.

## Gameplay Systems
- **Player:** Health/armor, optional sprint/jump, knockback response, crosshair with hit-flash; portrait and health bar on HUD.
- **Weapons (slots 1–8):** Knife, revolver, pump shotgun, double-barrel, Tommy gun, rocket launcher, laser gun, cannon. Distinct fire rates, spreads, splash/chain logic, ammo pools, muzzle flashes, reloads, and weapon swap delays.
- **Pickups:** Health/armor packs, ammo types, rare power-ups (Serious Damage/Speed, Invulnerability, Time Freeze) with timers and HUD icons.
- **Enemies:**
  - Beheaded Kamikaze (suicide rush, AoE explosion), Kleer Skeleton (zig-zag, leap, chainball throw), Sirian Werebull (charge knockback),
    Bio-Mechanoid minor/major (laser stream / homing rockets), Scythian Witch-Harpy (flying circles, ranged volley + dive),
    Final boss Ugh-Zan III (phased fireballs/lasers/rockets/stomp + minion summons).
  - Each enemy: health, AI state (chase/shoot/charge/leap/dive), hit flinch, death anim/gibs, unique sound loops.
- **Projectiles & effects:** Hitscan traces (laser), ballistic projectiles (rockets, chainballs, fireballs), AoE splash, smoke trails, blood/gib particles, screen shake on heavy hits, optional fog for depth.
- **Waves/Levels:** Data-driven wave scripts with spawn points and caps; 1–2s respite between waves; pickups seeded per wave. Linear progression across:
  1. **Ancient Egypt:** Open courtyard, pillars/obelisks, harpies in sky, sub-boss (Major Bio-Mechanoid). Reward: rocket launcher.
  2. **Kleer Stronghold:** Bone-littered wasteland at dusk; kleer stampedes, mixed artillery support; reward: laser gun.
  3. **Museum of History:** Urban exterior → two-floor interior → boss arena; simulated verticality via floor layers, railing cues, slight scale shift.

## Content & Assets
- **Sprites:** Unique hand-drawn sheets per enemy (idle/run/attack/flinch/death), weapon hands/muzzle flashes, props/backgrounds, particles.
- **Audio:** Weapon SFX, per-enemy loops and deaths, ambient beds per level, dynamic music per level plus boss theme; stereo panning for positional feel.
- **UI:** HUD icons, crosshair variants, menu backgrounds, level title cards, tip popups (NETRICSA-style) on first encounters.

## Implementation Milestones
1. **Bootstrap:** Canvas resize/fullscreen, input capture, frame loop, debug overlay for FPS/actor counts.
2. **Player & core weapon:** Movement + revolver hitscan; basic dummy target with collision/hit feedback.
3. **Rendering & animation:** Sprite loader/animator, distance scaling, billboarding; placeholder art swapped later.
4. **Enemy foundation:** Enemy base class; implement Kamikaze (rush + explosion) as template; add hit/death effects.
5. **Expand roster & projectiles:** Kleer (melee/leap/chainball), Werebull (charge), Bio-Mech (laser/rocket), Harpy (flying), boss stub with phased attacks; projectile behaviors and AoE.
6. **Arsenal completion:** Shotguns (pellet spread + pump/dual reload), Tommy gun auto fire, rocket splash/knockback, laser burst, cannon rolling projectile with multi-hit.
7. **Waves & levels:** Data-driven wave configs, spawn points, pickups, level transitions; build Egypt arena then Stronghold then Museum with dual-floor logic.
8. **HUD & menus:** Health/armor/ammo widgets, weapon selector, wave/level indicator, score; start/pause/game-over screens; tip popups.
9. **Audio pass:** Web Audio mixer, SFX hooks, music routing, volume ducking on chaos; positional panning where helpful.
10. **Polish & performance:** Particle limits, pooling, culling, screen shake, low-health vignette, difficulty tuning; cross-browser sanity checks.

## Testing & QA
- Manual playtests per level; target 60 FPS with ~20–30 active enemies and particle effects enabled.
- Edge cases: pointer lock loss, fullscreen toggle, pause/resume audio, projectile splash vs. self-damage, knockback near walls.
- Balancing sweeps for wave timings, pickup placement, and boss phases.

## Delivery
- Single-page launch via `index.html`; assets bundled or base64-embedded for offline play.
- Document build/run steps in `README.md`; keep code modular for future expansion.
