const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hud = {
  health: document.getElementById('hud-health'),
  armor: document.getElementById('hud-armor'),
  weapon: document.getElementById('hud-weapon'),
  ammo: document.getElementById('hud-ammo'),
  wave: document.getElementById('hud-wave'),
};

const overlay = document.getElementById('overlay');
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
};

const player = {
  x: 0,
  y: 0,
  speed: 220,
  health: 100,
  armor: 0,
  weapon: 'Revolver',
  ammo: Infinity,
};

const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0 },
};

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
  hud.ammo.textContent = player.ammo === Infinity ? '∞' : player.ammo;
  hud.wave.textContent = '0 / 0';
}

function handleInput(delta) {
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
    player.x += nx * player.speed * delta;
    player.y += ny * player.speed * delta;
  }

  player.x = Math.max(24, Math.min(state.width - 24, player.x));
  player.y = Math.max(24, Math.min(state.height - 24, player.y));
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

function render(delta) {
  resizeCanvas();
  drawBackdrop(delta);
  drawPlayer();
  drawCrosshair();
}

function loop(timestamp) {
  if (!state.running || state.paused) return;
  const delta = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  handleInput(delta);
  render(delta);
  requestAnimationFrame(loop);
}

function startGame() {
  state.running = true;
  state.lastTime = performance.now();
  overlay.classList.remove('visible');
  pauseOverlay.classList.remove('visible');
  player.x = state.width / 2;
  player.y = state.height * 0.65;
  updateHud();
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

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    if (state.paused) {
      resumeGame();
    } else {
      pauseGame();
    }
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

window.addEventListener('blur', () => {
  input.keys.clear();
  if (state.running) pauseGame();
});

startButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', resumeGame);
fullscreenButton.addEventListener('click', toggleFullscreen);

resizeCanvas();
updateHud();
