const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hud = {
  health: document.getElementById('hud-health'),
  armor: document.getElementById('hud-armor'),
  weapon: document.getElementById('hud-weapon'),
  ammo: document.getElementById('hud-ammo'),
  wave: document.getElementById('hud-wave'),
  score: document.getElementById('hud-score'),
  status: document.getElementById('hud-status'),
};

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDescription = document.getElementById('overlay-description');
const pauseOverlay = document.getElementById('pause');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const fullscreenButton = document.getElementById('fullscreen-button');

const state = {
  running: false,
  paused: false,
  lastTime: 0,
  width: canvas.clientWidth,
  height: canvas.clientHeight,
  waveIndex: 0,
  waveDelayUntil: null,
  score: 0,
  kills: 0,
  buffs: {
    seriousDamageUntil: 0,
    hasteUntil: 0,
  },
};

const player = {
  x: 0,
  y: 0,
  speed: 240,
  health: 100,
  armor: 0,
  weapon: 'Revolver',
  ammoPools: {
    Revolver: Infinity,
    Shotgun: 16,
    'Tommy Gun': 120,
    'Rocket Launcher': 6,
    'Laser Gun': 80,
    Cannon: 3,
  },
  radius: 14,
};

const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0 },
  shooting: false,
};

const bullets = [];
const enemies = [];
const pickups = [];
const explosions = [];
const bossShockwaves = [];

const weapons = {
  Revolver: {
    fireRate: 4, // shots per second
    speed: 620,
    damage: 28,
    color: '#ffd166',
    ammoKey: 'Revolver',
    pellets: 1,
    spread: 0,
  },
  Shotgun: {
    fireRate: 1.35,
    speed: 540,
    damage: 12,
    color: '#ff9b5f',
    ammoKey: 'Shotgun',
    pellets: 7,
    spread: 0.24,
  },
  'Double-Barrel': {
    fireRate: 0.9,
    speed: 520,
    damage: 24,
    color: '#fbbf24',
    ammoKey: 'Shotgun',
    pellets: 10,
    spread: 0.3,
  },
  'Tommy Gun': {
    fireRate: 9,
    speed: 700,
    damage: 10,
    color: '#76b3fa',
    ammoKey: 'Tommy Gun',
    pellets: 1,
    spread: 0.05,
  },
  'Rocket Launcher': {
    fireRate: 0.9,
    speed: 440,
    damage: 140,
    color: '#f87171',
    ammoKey: 'Rocket Launcher',
    pellets: 1,
    spread: 0,
    radius: 6,
    explosionRadius: 72,
    selfDamage: 0.5,
  },
  'Laser Gun': {
    fireRate: 7,
    speed: 880,
    damage: 16,
    color: '#7ce7ff',
    ammoKey: 'Laser Gun',
    pellets: 2,
    spread: 0.06,
  },
  Cannon: {
    fireRate: 0.45,
    speed: 360,
    damage: 220,
    color: '#ffe08a',
    ammoKey: 'Cannon',
    pellets: 1,
    spread: 0.02,
    radius: 8,
    explosionRadius: 110,
    selfDamage: 0.35,
  },
};

const enemyTypes = {
  Kamikaze: {
    radius: 14,
    speed: 140,
    damage: 25,
    health: 35,
    color: '#f25f5c',
  },
  Kleer: {
    radius: 16,
    speed: 120,
    damage: 32,
    health: 60,
    color: '#c9d1d9',
  },
  BioMech: {
    radius: 22,
    speed: 70,
    damage: 18,
    health: 120,
    color: '#9f7aea',
    fireRate: 1.4,
    projectileSpeed: 380,
  },
  Werebull: {
    radius: 18,
    speed: 220,
    damage: 42,
    health: 140,
    color: '#f59e0b',
  },
  Harpy: {
    radius: 14,
    speed: 170,
    damage: 18,
    health: 70,
    color: '#f9a8d4',
    fireRate: 1.8,
    projectileSpeed: 420,
  },
  UghZan: {
    radius: 32,
    speed: 55,
    damage: 55,
    health: 1200,
    color: '#f97316',
    fireRate: 1.1,
    projectileSpeed: 320,
  },
  Reptiloid: {
    radius: 18,
    speed: 90,
    damage: 30,
    health: 130,
    color: '#22d3ee',
    fireRate: 1.1,
    projectileSpeed: 360,
  },
};

const waves = [
  { type: 'Kamikaze', count: 6 },
  { type: 'Kamikaze', count: 10 },
  { type: 'Kleer', count: 6 },
  { type: 'Kleer', count: 7, bonus: { type: 'Kamikaze', count: 8 } },
  { type: 'BioMech', count: 3, bonus: { type: 'Kamikaze', count: 8 } },
  { type: 'Werebull', count: 4, bonus: { type: 'Kamikaze', count: 6 } },
  { type: 'Harpy', count: 8, bonus: { type: 'Kleer', count: 6 } },
  { type: 'Reptiloid', count: 5, bonus: { type: 'BioMech', count: 2 } },
  { type: 'UghZan', count: 1 },
];

const pickupTypes = {
  health: {
    radius: 14,
    color: '#4ade80',
    apply: () => {
      player.health = Math.min(100, player.health + 30);
    },
    label: '+HP',
  },
  armor: {
    radius: 14,
    color: '#60a5fa',
    apply: () => {
      player.armor = Math.min(75, player.armor + 20);
    },
    label: '+AR',
  },
  shells: {
    radius: 14,
    color: '#f4a261',
    apply: () => {
      player.ammoPools.Shotgun = Math.min(40, player.ammoPools.Shotgun + 8);
    },
    label: 'Shells',
  },
  smg: {
    radius: 14,
    color: '#93c5fd',
    apply: () => {
      player.ammoPools['Tommy Gun'] = Math.min(240, player.ammoPools['Tommy Gun'] + 40);
    },
    label: 'SMG',
  },
  rockets: {
    radius: 14,
    color: '#fb7185',
    apply: () => {
      player.ammoPools['Rocket Launcher'] = Math.min(12, player.ammoPools['Rocket Launcher'] + 3);
    },
    label: 'Rockets',
  },
  cells: {
    radius: 14,
    color: '#7ce7ff',
    apply: () => {
      player.ammoPools['Laser Gun'] = Math.min(160, player.ammoPools['Laser Gun'] + 24);
    },
    label: 'Cells',
  },
  cannonballs: {
    radius: 14,
    color: '#ffd166',
    apply: () => {
      player.ammoPools.Cannon = Math.min(8, player.ammoPools.Cannon + 2);
    },
    label: 'Cannon',
  },
  serious: {
    radius: 16,
    color: '#bf34ff',
    apply: () => {
      state.buffs.seriousDamageUntil = performance.now() + 11000;
    },
    label: 'Serious',
  },
  haste: {
    radius: 16,
    color: '#2dd4bf',
    apply: () => {
      state.buffs.hasteUntil = performance.now() + 9000;
    },
    label: 'Speed',
  },
};

let lastShotTime = 0;
const enemyProjectiles = [];

function resizeCanvas() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    canvas.width = clientWidth;
    canvas.height = clientHeight;
    state.width = clientWidth;
    state.height = clientHeight;
  }
}

function screenToWorld(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: x - rect.left,
    y: y - rect.top,
  };
}

function updateHud() {
  hud.health.textContent = player.health.toFixed(0);
  hud.armor.textContent = player.armor.toFixed(0);
  hud.weapon.textContent = player.weapon;
  const activeWeapon = weapons[player.weapon];
  const ammoKey = activeWeapon?.ammoKey ?? player.weapon;
  const ammo = player.ammoPools[ammoKey];
  hud.ammo.textContent = ammo === Infinity ? '∞' : ammo;
  hud.wave.textContent = `${state.waveIndex + 1} / ${waves.length}`;
  hud.score.textContent = state.score.toFixed(0);
}

function getDamageMultiplier(now = performance.now()) {
  return now < state.buffs.seriousDamageUntil ? 2 : 1;
}

function getSpeedMultiplier(now = performance.now()) {
  return now < state.buffs.hasteUntil ? 1.25 : 1;
}

function updateStatusHud(now = performance.now()) {
  const active = [];
  if (now < state.buffs.seriousDamageUntil) {
    active.push('Serious Damage');
  }
  if (now < state.buffs.hasteUntil) {
    active.push('Speed Boost');
  }
  hud.status.textContent = active.length ? active.join(' • ') : 'None';
}

function handleInput(delta, timestamp) {
  let dx = 0;
  let dy = 0;

  if (input.keys.has('KeyW')) dy -= 1;
  if (input.keys.has('KeyS')) dy += 1;
  if (input.keys.has('KeyA')) dx -= 1;
  if (input.keys.has('KeyD')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    const nx = dx / length;
    const ny = dy / length;
    const moveSpeed = player.speed * getSpeedMultiplier();
    player.x += nx * moveSpeed * delta;
    player.y += ny * moveSpeed * delta;
  }

  player.x = Math.max(24, Math.min(state.width - 24, player.x));
  player.y = Math.max(24, Math.min(state.height - 24, player.y));

  if (input.shooting) {
    tryShoot(timestamp);
  }
}

function drawCrosshair() {
  const size = 10;
  ctx.save();
  ctx.translate(input.mouse.x, input.mouse.y);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = '#ffaf00';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function tryShoot(timestamp) {
  const weapon = weapons[player.weapon];
  if (!weapon) return;

  const interval = 1000 / weapon.fireRate;
  if (timestamp - lastShotTime < interval) return;

  const ammoPool = player.ammoPools[weapon.ammoKey];
  if (ammoPool !== Infinity && ammoPool <= 0) return;

  const dirX = input.mouse.x - player.x;
  const dirY = input.mouse.y - player.y;
  const baseAngle = Math.atan2(dirY, dirX);

  for (let i = 0; i < weapon.pellets; i += 1) {
    const spread = weapon.spread * (Math.random() - 0.5);
    const angle = baseAngle + spread;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);

    bullets.push({
      x: player.x + nx * (player.radius + 6),
      y: player.y + ny * (player.radius + 6),
      vx: nx * weapon.speed,
      vy: ny * weapon.speed,
      life: 1.6,
      color: weapon.color,
      damage: weapon.damage,
      radius: weapon.radius ?? 4,
      explosionRadius: weapon.explosionRadius,
      selfDamage: weapon.selfDamage,
    });
  }

  if (ammoPool !== Infinity) {
    player.ammoPools[weapon.ammoKey] -= 1;
  }

  lastShotTime = timestamp;
  updateHud();
}

function spawnEnemy(type) {
  const definition = enemyTypes[type];
  if (!definition) return;

  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = Math.random() * state.width;
    y = -definition.radius * 2;
  } else if (edge === 1) {
    x = state.width + definition.radius * 2;
    y = Math.random() * state.height;
  } else if (edge === 2) {
    x = Math.random() * state.width;
    y = state.height + definition.radius * 2;
  } else {
    x = -definition.radius * 2;
    y = Math.random() * state.height;
  }

  enemies.push({
    type,
    x,
    y,
    radius: definition.radius,
    speed: definition.speed,
    damage: definition.damage,
    health: definition.health,
    color: definition.color,
    lastShot: 0,
    nextDive: performance.now() + 1200 + Math.random() * 1400,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
  });
}

function spawnWave(index) {
  const wave = waves[index];
  if (!wave) return;
  for (let i = 0; i < wave.count; i += 1) {
    spawnEnemy(wave.type);
  }
  if (wave.bonus) {
    for (let i = 0; i < wave.bonus.count; i += 1) {
      spawnEnemy(wave.bonus.type);
    }
  }
}

function spawnPickup(type) {
  const definition = pickupTypes[type];
  if (!definition) return;
  const padding = 40;
  const x = padding + Math.random() * (state.width - padding * 2);
  const y = padding + Math.random() * (state.height - padding * 2);
  pickups.push({ type, x, y, radius: definition.radius });
}

function drawBackdrop(delta) {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, '#0b1018');
  gradient.addColorStop(0.55, '#121d2b');
  gradient.addColorStop(1, '#0a0f18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  const horizon = state.height * 0.58;
  ctx.fillStyle = '#1b2638';
  ctx.fillRect(0, horizon, state.width, state.height - horizon);

  const time = performance.now() / 1000;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const spacing = 60;
  for (let x = -((time * 15) % spacing); x < state.width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(x + 40, state.height);
    ctx.stroke();
  }
}

function drawBullets(delta) {
  ctx.save();
  bullets.forEach((bullet) => {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    const radius = bullet.radius ?? 4;
    ctx.arc(bullet.x, bullet.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawExplosions() {
  explosions.forEach((explosion) => {
    const alpha = Math.max(0, explosion.life / explosion.maxLife);
    ctx.fillStyle = `rgba(255, 184, 107, ${alpha})`;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius * (1 - alpha * 0.35), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawEnemyProjectiles() {
  ctx.save();
  enemyProjectiles.forEach((projectile) => {
    ctx.fillStyle = projectile.color ?? 'rgba(255, 149, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius ?? 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.restore();
}

function drawShockwaves() {
  bossShockwaves.forEach((wave) => {
    const alpha = Math.max(0, wave.life / wave.maxLife);
    ctx.strokeStyle = `rgba(255, 171, 89, ${alpha})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius * (1 - alpha * 0.25), 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Health ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    const healthRatio = Math.max(0, enemy.health) / enemyTypes[enemy.type].health;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * healthRatio);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPickups() {
  pickups.forEach((pickup) => {
    const def = pickupTypes[pickup.type];
    if (!def) return;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0b1018';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.label, 0, 0);
    ctx.restore();
  });
}

function render(delta) {
  resizeCanvas();
  drawBackdrop(delta);
  drawPickups();
  drawPlayer();
  drawBullets(delta);
  drawExplosions();
  drawEnemyProjectiles();
  drawShockwaves();
  drawEnemies();
  drawCrosshair();
}

function damagePlayer(amount) {
  let remaining = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, remaining * 0.6);
    player.armor -= absorbed;
    remaining -= absorbed;
  }
  player.health -= remaining;
  updateHud();
  if (player.health <= 0) {
    endRun(false);
  }
}

function registerKill(type) {
  const scores = {
    Kamikaze: 25,
    Kleer: 40,
    BioMech: 55,
    Werebull: 80,
    Harpy: 45,
    Reptiloid: 70,
    UghZan: 500,
  };
  state.kills += 1;
  state.score += scores[type] ?? 30;
  updateHud();
}

function detonate(bullet, x, y) {
  if (!bullet.explosionRadius) return;
  explosions.push({ x, y, radius: bullet.explosionRadius, life: 0.25, maxLife: 0.25 });
  const damage = bullet.damage * getDamageMultiplier();

  for (let j = enemies.length - 1; j >= 0; j -= 1) {
    const enemy = enemies[j];
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist <= enemy.radius + bullet.explosionRadius) {
      enemy.health -= damage;
      if (enemy.health <= 0) {
        registerKill(enemy.type);
        enemies.splice(j, 1);
      }
    }
  }

  if (bullet.selfDamage) {
    const playerDist = Math.hypot(player.x - x, player.y - y);
    if (playerDist <= bullet.explosionRadius + player.radius) {
      damagePlayer(bullet.damage * bullet.selfDamage);
    }
  }
}

function updateBullets(delta) {
  const now = performance.now();
  const damageMultiplier = getDamageMultiplier(now);
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.x > state.width + 20 ||
      bullet.y < -20 ||
      bullet.y > state.height + 20
    ) {
      if (bullet.explosionRadius) {
        detonate(bullet, bullet.x, bullet.y);
      }
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      const hitRange = enemy.radius + (bullet.radius ?? 4);
      if (dist <= hitRange) {
        if (bullet.explosionRadius) {
          detonate(bullet, bullet.x, bullet.y);
        } else {
          enemy.health -= bullet.damage * damageMultiplier;
          if (enemy.health <= 0) {
            registerKill(enemy.type);
            enemies.splice(j, 1);
          }
        }
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function updateEnemyProjectiles(delta) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = enemyProjectiles[i];
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;

    const offscreen =
      projectile.x < -24 ||
      projectile.x > state.width + 24 ||
      projectile.y < -24 ||
      projectile.y > state.height + 24;
    if (offscreen) {
      enemyProjectiles.splice(i, 1);
      continue;
    }

    const dist = Math.hypot(projectile.x - player.x, projectile.y - player.y);
    if (dist <= (projectile.radius ?? 5) + player.radius) {
      if (projectile.explosionRadius) {
        explosions.push({ x: projectile.x, y: projectile.y, radius: projectile.explosionRadius, life: 0.3, maxLife: 0.3 });
        damagePlayer(projectile.damage);
      } else {
        damagePlayer(projectile.damage);
      }
      enemyProjectiles.splice(i, 1);
    }
  }
}

function updateExplosions(delta) {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const explosion = explosions[i];
    explosion.life -= delta;
    if (explosion.life <= 0) {
      explosions.splice(i, 1);
    }
  }

  for (let i = bossShockwaves.length - 1; i >= 0; i -= 1) {
    const wave = bossShockwaves[i];
    wave.life -= delta;
    if (wave.life <= 0) {
      bossShockwaves.splice(i, 1);
    }
  }
}

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    let distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
    if (enemy.type === 'BioMech') {
      const dirX = player.x - enemy.x;
      const dirY = player.y - enemy.y;
      const dist = distToPlayer;
      const nx = dirX / dist;
      const ny = dirY / dist;
      const preferredRange = 280;
      if (dist < preferredRange - 10) {
        enemy.x -= nx * enemy.speed * delta;
        enemy.y -= ny * enemy.speed * delta;
      } else if (dist > preferredRange + 30) {
        enemy.x += nx * enemy.speed * delta;
        enemy.y += ny * enemy.speed * delta;
      }

      const fireInterval = 1000 / enemyTypes.BioMech.fireRate;
      if (performance.now() - enemy.lastShot > fireInterval) {
        const projSpeed = enemyTypes.BioMech.projectileSpeed;
        enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: nx * projSpeed,
          vy: ny * projSpeed,
          radius: 6,
          damage: enemy.damage,
        });
        enemy.lastShot = performance.now();
      }
    } else if (enemy.type === 'Werebull') {
      const dirX = player.x - enemy.x;
      const dirY = player.y - enemy.y;
      const dist = distToPlayer;
      const nx = dirX / dist;
      const ny = dirY / dist;
      const chargeMultiplier = dist > 240 ? 1.25 : 1.05;

      enemy.x += nx * enemy.speed * chargeMultiplier * delta;
      enemy.y += ny * enemy.speed * chargeMultiplier * delta;
    } else if (enemy.type === 'Harpy') {
      const dirX = player.x - enemy.x;
      const dirY = player.y - enemy.y;
      const dist = distToPlayer;
      const nx = dirX / dist;
      const ny = dirY / dist;
      const preferredRange = 220;
      if (dist > preferredRange + 20) {
        enemy.x += nx * enemy.speed * delta;
        enemy.y += ny * enemy.speed * delta;
      } else if (dist < preferredRange - 50) {
        enemy.x -= nx * enemy.speed * 0.9 * delta;
        enemy.y -= ny * enemy.speed * 0.9 * delta;
      } else {
        enemy.x += -ny * enemy.speed * 0.7 * delta;
        enemy.y += nx * enemy.speed * 0.7 * delta;
      }

      const now = performance.now();
      const fireInterval = 1000 / enemyTypes.Harpy.fireRate;
      if (now - enemy.lastShot > fireInterval) {
        const projSpeed = enemyTypes.Harpy.projectileSpeed;
        enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: nx * projSpeed,
          vy: ny * projSpeed,
          radius: 5,
          damage: enemy.damage,
        });
        enemy.lastShot = now;
      }

      if (now >= enemy.nextDive && dist < 200) {
        enemy.x += nx * enemy.speed * 1.4 * delta;
        enemy.y += ny * enemy.speed * 1.4 * delta;
        enemy.nextDive = now + 2000 + Math.random() * 1800;
      }
    } else if (enemy.type === 'Reptiloid') {
      const dirX = player.x - enemy.x;
      const dirY = player.y - enemy.y;
      const dist = distToPlayer;
      const nx = dirX / dist;
      const ny = dirY / dist;
      const preferredRange = 260;

      if (dist > preferredRange + 20) {
        enemy.x += nx * enemy.speed * delta;
        enemy.y += ny * enemy.speed * delta;
      } else if (dist < preferredRange - 30) {
        enemy.x -= nx * enemy.speed * delta;
        enemy.y -= ny * enemy.speed * delta;
      } else {
        enemy.x += -ny * enemy.speed * 0.7 * enemy.strafeDir * delta;
        enemy.y += nx * enemy.speed * 0.7 * enemy.strafeDir * delta;
      }

      if (Math.random() > 0.995) {
        enemy.strafeDir *= -1;
      }

      const now = performance.now();
      const fireInterval = 1000 / enemyTypes.Reptiloid.fireRate;
      if (now - enemy.lastShot > fireInterval) {
        const projSpeed = enemyTypes.Reptiloid.projectileSpeed;
        const wobble = (Math.random() - 0.5) * 0.18;
        const angle = Math.atan2(ny, nx) + wobble;
        enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          radius: 7,
          damage: enemy.damage,
          explosionRadius: 46,
          color: 'rgba(34, 211, 238, 0.9)',
        });
        enemy.lastShot = now;
      }
    } else if (enemy.type === 'UghZan') {
      const dirX = player.x - enemy.x;
      const dirY = player.y - enemy.y;
      const dist = distToPlayer;
      const nx = dirX / dist;
      const ny = dirY / dist;

      if (dist > 220) {
        enemy.x += nx * enemy.speed * delta;
        enemy.y += ny * enemy.speed * delta;
      }

      const now = performance.now();
      const fireInterval = 1000 / enemyTypes.UghZan.fireRate;
      if (now - enemy.lastShot > fireInterval) {
        const projSpeed = enemyTypes.UghZan.projectileSpeed;
        for (let n = 0; n < 3; n += 1) {
          const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.25;
          const ax = Math.cos(angle);
          const ay = Math.sin(angle);
          enemyProjectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: ax * projSpeed,
            vy: ay * projSpeed,
            radius: 8,
            damage: enemy.damage,
            explosionRadius: 70,
            color: 'rgba(255, 143, 94, 0.9)',
          });
        }
        enemy.lastShot = now;
      }

      if (!enemy.lastStomp) {
        enemy.lastStomp = now + 1800;
      }
      if (now >= enemy.lastStomp) {
        bossShockwaves.push({ x: enemy.x, y: enemy.y, radius: 180, life: 0.45, maxLife: 0.45 });
        const stompDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (stompDist <= 200) {
          damagePlayer(enemy.damage * 0.75);
        }
        enemy.lastStomp = now + 2400 + Math.random() * 1200;
      }
    } else {
      const dirX = player.x - enemy.x;
      const dirY = player.y - enemy.y;
      const dist = distToPlayer;
      const nx = dirX / dist;
      const ny = dirY / dist;

      enemy.x += nx * enemy.speed * delta;
      enemy.y += ny * enemy.speed * delta;
    }

    distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
    if (distToPlayer <= enemy.radius + player.radius) {
      damagePlayer(enemy.damage);
      enemies.splice(i, 1);
    }
  }

  if (enemies.length === 0 && !state.waveDelayUntil) {
    if (state.waveIndex < waves.length - 1) {
      state.waveDelayUntil = performance.now() + 1200;
      spawnIntermissionPickups();
    } else {
      endRun(true);
    }
  }
}

function updatePickups() {
  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    const dist = Math.hypot(pickup.x - player.x, pickup.y - player.y);
    if (dist <= pickup.radius + player.radius) {
      const def = pickupTypes[pickup.type];
      if (def && typeof def.apply === 'function') {
        def.apply();
      }
      pickups.splice(i, 1);
      updateHud();
      updateStatusHud();
    }
  }
}

function spawnIntermissionPickups() {
  pickups.length = 0;
  spawnPickup('health');
  spawnPickup('shells');
  spawnPickup('smg');
  spawnPickup('rockets');
  spawnPickup('cells');
  if (state.waveIndex >= 4) {
    spawnPickup('cannonballs');
  }
  if (Math.random() > 0.4) {
    spawnPickup('armor');
  }
  if (Math.random() > 0.45) {
    spawnPickup('serious');
  }
  if (Math.random() > 0.5) {
    spawnPickup('haste');
  }
}

function endRun(victory) {
  state.running = false;
  state.paused = false;
  overlayTitle.textContent = victory ? 'Victory!' : 'Garo has fallen';
  overlayDescription.textContent = victory
    ? 'You felled Ugh-Zan III and survived the full gauntlet. Continue the fight soon.'
    : 'Enemies overwhelmed Garo. Try again to push further.';
  startButton.textContent = 'Restart';
  overlay.classList.add('visible');
}

function loop(timestamp) {
  if (!state.running || state.paused) return;
  const delta = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;

  if (state.waveDelayUntil && timestamp >= state.waveDelayUntil) {
    state.waveDelayUntil = null;
    state.waveIndex += 1;
    if (state.waveIndex < waves.length) {
      spawnWave(state.waveIndex);
      updateHud();
    }
  }

  handleInput(delta, timestamp);
  updateBullets(delta);
  updateEnemies(delta);
  updateEnemyProjectiles(delta);
  updatePickups();
  updateExplosions(delta);
  updateStatusHud(timestamp);
  render(delta);
  requestAnimationFrame(loop);
}

function startGame() {
  state.running = true;
  state.paused = false;
  state.lastTime = performance.now();
  state.waveIndex = 0;
  state.waveDelayUntil = null;
  state.score = 0;
  state.kills = 0;
  state.buffs.seriousDamageUntil = 0;
  state.buffs.hasteUntil = 0;
  bullets.length = 0;
  enemies.length = 0;
  enemyProjectiles.length = 0;
  pickups.length = 0;
  bossShockwaves.length = 0;
  lastShotTime = 0;
  overlay.classList.remove('visible');
  pauseOverlay.classList.remove('visible');
  overlayTitle.textContent = "Garo's First Encounter";
  overlayDescription.textContent = 'Browser-based 2D pseudo-3D shooter prototype.';
  startButton.textContent = 'Start';
  player.health = 100;
  player.armor = 10;
  player.x = state.width / 2;
  player.y = state.height * 0.65;
  player.weapon = 'Revolver';
  player.ammoPools.Revolver = Infinity;
  player.ammoPools.Shotgun = 20;
  player.ammoPools['Tommy Gun'] = 120;
  player.ammoPools['Rocket Launcher'] = 6;
  player.ammoPools['Laser Gun'] = 80;
  player.ammoPools.Cannon = 3;
  spawnWave(state.waveIndex);
  spawnPickup('shells');
  spawnPickup('smg');
  spawnPickup('rockets');
  spawnPickup('cells');
  spawnPickup('cannonballs');
  updateHud();
  updateStatusHud();
  requestAnimationFrame(loop);
}

function pauseGame() {
  if (!state.running) return;
  state.paused = true;
  pauseOverlay.classList.add('visible');
}

function resumeGame() {
  if (!state.running) return;
  state.paused = false;
  pauseOverlay.classList.remove('visible');
  state.lastTime = performance.now();
  requestAnimationFrame(loop);
}

function toggleFullscreen() {
  const root = document.getElementById('game-root');
  if (!document.fullscreenElement) {
    root.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function switchWeapon(slot) {
  if (slot === 1) {
    player.weapon = 'Revolver';
    updateHud();
  } else if (slot === 2) {
    player.weapon = 'Shotgun';
    updateHud();
  } else if (slot === 3) {
    player.weapon = 'Tommy Gun';
    updateHud();
  } else if (slot === 4) {
    player.weapon = 'Rocket Launcher';
    updateHud();
  } else if (slot === 5) {
    player.weapon = 'Laser Gun';
    updateHud();
  } else if (slot === 6) {
    player.weapon = 'Cannon';
    updateHud();
  } else if (slot === 7) {
    player.weapon = 'Double-Barrel';
    updateHud();
  }
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    if (state.paused) {
      resumeGame();
    } else {
      pauseGame();
    }
    return;
  }

  if (event.code === 'Digit1' || event.code === 'Numpad1') {
    switchWeapon(1);
    return;
  }
  if (event.code === 'Digit2' || event.code === 'Numpad2') {
    switchWeapon(2);
    return;
  }
  if (event.code === 'Digit3' || event.code === 'Numpad3') {
    switchWeapon(3);
    return;
  }
  if (event.code === 'Digit4' || event.code === 'Numpad4') {
    switchWeapon(4);
    return;
  }
  if (event.code === 'Digit5' || event.code === 'Numpad5') {
    switchWeapon(5);
    return;
  }
  if (event.code === 'Digit6' || event.code === 'Numpad6') {
    switchWeapon(6);
    return;
  }
  if (event.code === 'Digit7' || event.code === 'Numpad7') {
    switchWeapon(7);
    return;
  }

  input.keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  input.keys.delete(event.code);
});

window.addEventListener('mousemove', (event) => {
  const { x, y } = screenToWorld(event.clientX, event.clientY);
  input.mouse.x = x;
  input.mouse.y = y;
});

window.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    input.shooting = true;
  }
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    input.shooting = false;
  }
});

window.addEventListener('blur', () => {
  input.keys.clear();
  input.shooting = false;
  if (state.running) pauseGame();
});

startButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', resumeGame);
fullscreenButton.addEventListener('click', toggleFullscreen);

resizeCanvas();
updateHud();
