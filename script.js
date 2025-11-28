const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hud = {
  health: document.getElementById('hud-health'),
  armor: document.getElementById('hud-armor'),
  weapon: document.getElementById('hud-weapon'),
  ammo: document.getElementById('hud-ammo'),
  wave: document.getElementById('hud-wave'),
  remaining: document.getElementById('hud-remaining'),
  score: document.getElementById('hud-score'),
  status: document.getElementById('hud-status'),
};

const buffHud = {
  serious: {
    root: document.getElementById('buff-serious'),
    fill: document.getElementById('buff-serious-fill'),
    timer: document.getElementById('buff-serious-timer'),
    duration: 11000,
  },
  haste: {
    root: document.getElementById('buff-haste'),
    fill: document.getElementById('buff-haste-fill'),
    timer: document.getElementById('buff-haste-timer'),
    duration: 9000,
  },
};

const bossHud = {
  root: document.getElementById('boss-health'),
  label: document.getElementById('boss-bar-label'),
  fill: document.getElementById('boss-bar-fill'),
};

const gameRoot = document.getElementById('game-root');
const crosshair = document.getElementById('crosshair');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDescription = document.getElementById('overlay-description');
const pauseOverlay = document.getElementById('pause');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const difficultySelect = document.getElementById('difficulty-select');
const overlaySummary = document.getElementById('overlay-summary');
const bestRunsContainer = document.getElementById('best-runs');
const resetProgressButton = document.getElementById('reset-progress');
const audioButton = document.getElementById('audio-button');
const musicButton = document.getElementById('music-button');
const effectsButton = document.getElementById('effects-button');
const statsButton = document.getElementById('stats-button');
const resetSettingsButton = document.getElementById('reset-settings');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const musicVolumeValue = document.getElementById('music-volume-value');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const sensitivityValue = document.getElementById('sensitivity-value');
const crosshairSizeSlider = document.getElementById('crosshair-size');
const crosshairSizeValue = document.getElementById('crosshair-size-value');
const crosshairColorInput = document.getElementById('crosshair-color');
const statsReadout = document.getElementById('stats-readout');
const fullscreenButton = document.getElementById('fullscreen-button');

const difficulties = {
    easy: {
      label: 'Easy',
      enemyHealth: 0.9,
      enemyDamage: 0.85,
      enemyCount: 0.85,
      enemySpeed: 0.95,
      playerHealth: 120,
      playerArmor: 25,
      scoreMultiplier: 0.75,
    },
    normal: {
      label: 'Normal',
      enemyHealth: 1,
      enemyDamage: 1,
      enemyCount: 1,
      enemySpeed: 1,
      playerHealth: 100,
      playerArmor: 10,
      scoreMultiplier: 1,
    },
    hard: {
      label: 'Hard',
      enemyHealth: 1.2,
      enemyDamage: 1.25,
      enemyCount: 1.15,
      enemySpeed: 1.08,
      playerHealth: 90,
      playerArmor: 0,
      scoreMultiplier: 1.25,
    },
  };

const defaultSettings = Object.freeze({
  volume: 1,
  audioEnabled: true,
  musicEnabled: true,
  effectsEnabled: true,
  statsEnabled: false,
  sensitivity: 1,
  difficulty: 'normal',
  crosshairSize: 24,
  crosshairColor: '#ffffff',
  musicVolume: 1,
});

let audioEnabled = true;
let masterVolume = 1;
let musicEnabled = true;
let musicVolume = 1;
let mouseSensitivity = 1;
let crosshairSize = 24;
let crosshairColor = '#ffffff';
let crosshairFlashUntil = 0;
let crosshairFlashColor = null;
let statsEnabled = false;
let audioContext = null;
let music = {
  oscillator: null,
  gain: null,
  beatInterval: null,
  intensity: null,
};
let frameTimes = [];

function ensureAudioContext() {
  if (!audioEnabled) return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone({ type = 'square', frequency = 440, duration = 0.14, gain = 0.12, detune = 0, startAt, volumeScale }) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const effectiveGain = gain * (volumeScale ?? masterVolume);
  if (effectiveGain <= 0) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  if (detune) {
    osc.detune.value = detune;
  }
  const now = startAt ?? ctx.currentTime;
  gainNode.gain.setValueAtTime(effectiveGain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gainNode).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(duration = 0.16, gain = 0.14, volumeScale) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const effectiveGain = gain * (volumeScale ?? masterVolume);
  if (effectiveGain <= 0) return;
  const bufferSize = duration * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gainNode = ctx.createGain();
  const now = ctx.currentTime;
  gainNode.gain.setValueAtTime(effectiveGain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(gainNode).connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
}

function playSfx(name) {
  if (!audioEnabled) return;
  switch (name) {
    case 'revolver':
      playTone({ type: 'square', frequency: 430, duration: 0.1, gain: 0.12 });
      break;
    case 'shotgun':
      playNoise(0.18, 0.18);
      playTone({ type: 'sawtooth', frequency: 240, duration: 0.14, gain: 0.12, detune: -120 });
      break;
    case 'tommy':
      playTone({ type: 'square', frequency: 360, duration: 0.08, gain: 0.1 });
      break;
    case 'rocket':
      playTone({ type: 'sawtooth', frequency: 190, duration: 0.2, gain: 0.13 });
      break;
    case 'laser':
      playTone({ type: 'triangle', frequency: 820, duration: 0.09, gain: 0.1, detune: 60 });
      break;
    case 'cannon':
      playNoise(0.28, 0.2);
      playTone({ type: 'square', frequency: 120, duration: 0.24, gain: 0.14 });
      break;
    case 'knife':
      playTone({ type: 'square', frequency: 560, duration: 0.08, gain: 0.08 });
      break;
    case 'explosion':
      playNoise(0.22, 0.22);
      break;
    case 'pickup':
      playTone({ type: 'triangle', frequency: 680, duration: 0.12, gain: 0.1 });
      break;
    case 'buff':
      playTone({ type: 'square', frequency: 760, duration: 0.18, gain: 0.12 });
      break;
    case 'hurt':
      playTone({ type: 'sawtooth', frequency: 220, duration: 0.12, gain: 0.1, detune: -60 });
      break;
    case 'enemyFire':
      playTone({ type: 'triangle', frequency: 320, duration: 0.08, gain: 0.08 });
      break;
    default:
      break;
  }
}

function stopMusic() {
  if (music.beatInterval) {
    clearInterval(music.beatInterval);
    music.beatInterval = null;
  }
  if (music.oscillator) {
    try {
      music.oscillator.stop();
    } catch (e) {
      // ignore
    }
    music.oscillator.disconnect();
    music.oscillator = null;
  }
  if (music.gain) {
    music.gain.disconnect();
    music.gain = null;
  }
  music.intensity = null;
}

function getMusicConfig(intensity) {
  return (
    {
      calm: { baseFreq: 82, beatFreq: 220, beatGain: 0.05, gain: 0.06, bpm: 96 },
      build: { baseFreq: 108, beatFreq: 280, beatGain: 0.06, gain: 0.07, bpm: 110 },
      combat: { baseFreq: 140, beatFreq: 340, beatGain: 0.07, gain: 0.08, bpm: 124 },
      boss: { baseFreq: 170, beatFreq: 420, beatGain: 0.08, gain: 0.09, bpm: 134 },
    }[intensity] || { baseFreq: 100, beatFreq: 260, beatGain: 0.05, gain: 0.06, bpm: 110 }
  );
}

function startMusic(intensity = 'build') {
  if (!audioEnabled || !musicEnabled) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;

  stopMusic();
  music.intensity = intensity;

  const config = getMusicConfig(intensity);

  music.oscillator = ctx.createOscillator();
  music.oscillator.type = 'sawtooth';
  music.oscillator.frequency.value = config.baseFreq;

  music.gain = ctx.createGain();
  music.gain.gain.setValueAtTime(config.gain * musicVolume, ctx.currentTime);

  music.oscillator.connect(music.gain).connect(ctx.destination);
  music.oscillator.start();

  const beatIntervalMs = (60 / config.bpm) * 1000;
  music.beatInterval = setInterval(() => {
    if (!audioEnabled || !musicEnabled) {
      stopMusic();
      return;
    }
    const now = ctx.currentTime;
    playNoise(0.05, config.beatGain, musicVolume);
    playTone({ type: 'square', frequency: config.beatFreq, duration: 0.08, gain: config.beatGain * 0.9, startAt: now, volumeScale: musicVolume });
  }, beatIntervalMs);
}

function updateMusicVolume() {
  if (!music.gain) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const config = getMusicConfig(music.intensity || 'build');
  music.gain.gain.setValueAtTime(config.gain * musicVolume, ctx.currentTime);
}

function setVolume(value, { persist = true } = {}) {
  masterVolume = clamp(value, 0, 1);
  if (volumeSlider) {
    volumeSlider.value = Math.round(masterVolume * 100);
  }
  if (volumeValue) {
    volumeValue.textContent = `${Math.round(masterVolume * 100)}%`;
  }
  updateMusicVolume();
  if (persist) {
    persistSettings();
  }
}

function setMusicVolume(value, { persist = true } = {}) {
  musicVolume = clamp(value, 0, 1);
  if (musicVolumeSlider) {
    musicVolumeSlider.value = Math.round(musicVolume * 100);
  }
  if (musicVolumeValue) {
    musicVolumeValue.textContent = `${Math.round(musicVolume * 100)}%`;
  }
  updateMusicVolume();
  if (persist) {
    persistSettings();
  }
}

function setSensitivity(value, { persist = true } = {}) {
  mouseSensitivity = clamp(value, 0.4, 2);
  if (sensitivitySlider) {
    sensitivitySlider.value = Math.round(mouseSensitivity * 100);
  }
  if (sensitivityValue) {
    sensitivityValue.textContent = `${Math.round(mouseSensitivity * 100)}%`;
  }

  if (persist) {
    persistSettings();
  }
}

function refreshAudioUi() {
  if (audioButton) {
    audioButton.textContent = audioEnabled ? 'Audio: On' : 'Audio: Off';
  }
  setVolume(masterVolume, { persist: false });
  if (musicButton) {
    musicButton.textContent = musicEnabled ? 'Music: On' : 'Music: Off';
  }
  setMusicVolume(musicVolume, { persist: false });
}

function refreshSensitivityUi() {
  setSensitivity(mouseSensitivity, { persist: false });
}

function setCrosshairSize(value, { persist = true } = {}) {
  crosshairSize = clamp(Math.round(value), 14, 48);
  if (crosshairSizeSlider) {
    crosshairSizeSlider.value = crosshairSize;
  }
  if (crosshairSizeValue) {
    crosshairSizeValue.textContent = `${crosshairSize}px`;
  }
  applyCrosshairStyle();
  if (persist) {
    persistSettings();
  }
}

function setCrosshairColor(value, { persist = true } = {}) {
  crosshairColor = normalizeColor(value, '#ffffff');
  if (crosshairColorInput) {
    crosshairColorInput.value = crosshairColor;
  }
  applyCrosshairStyle();
  if (persist) {
    persistSettings();
  }
}

function refreshCrosshairUi() {
  setCrosshairSize(crosshairSize, { persist: false });
  setCrosshairColor(crosshairColor, { persist: false });
}

function refreshEffectsUi() {
  if (effectsButton) {
    effectsButton.textContent = state.effectsEnabled ? 'Effects: On' : 'Effects: Off';
  }
}

function refreshStatsUi() {
  if (statsButton) {
    statsButton.textContent = statsEnabled ? 'Stats: On' : 'Stats: Off';
  }
  if (!statsEnabled && statsReadout) {
    statsReadout.textContent = '';
  }
}

function setMusicIntensity(intensity) {
  if (!audioEnabled || !musicEnabled) {
    stopMusic();
    return;
  }
  if (music.intensity === intensity && music.oscillator) return;
  startMusic(intensity);
}

function getDifficultySettings() {
  return difficulties[state.difficulty] || difficulties.normal;
}

const SETTINGS_KEY = 'garoSettings';
const BEST_RUNS_KEY = 'garoBestRuns';

function getDefaultSettings() {
  return { ...defaultSettings };
}

function normalizeSettings(raw) {
  const fallback = defaultSettings;
  const difficulty = difficulties[raw?.difficulty] ? raw.difficulty : fallback.difficulty;
  return {
    volume: clamp(raw?.volume ?? fallback.volume, 0, 1),
    audioEnabled: raw?.audioEnabled ?? fallback.audioEnabled,
    musicEnabled: raw?.musicEnabled ?? fallback.musicEnabled,
    effectsEnabled: raw?.effectsEnabled ?? fallback.effectsEnabled,
    statsEnabled: raw?.statsEnabled ?? fallback.statsEnabled,
    sensitivity: clamp(raw?.sensitivity ?? fallback.sensitivity, 0.4, 2),
    difficulty,
    crosshairSize: clamp(raw?.crosshairSize ?? fallback.crosshairSize, 14, 48),
    crosshairColor: normalizeColor(raw?.crosshairColor ?? fallback.crosshairColor, fallback.crosshairColor),
    musicVolume: clamp(raw?.musicVolume ?? fallback.musicVolume, 0, 1),
  };
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return getDefaultSettings();
    const parsed = JSON.parse(saved);
    return normalizeSettings(parsed);
  } catch (error) {
    console.warn('Could not load settings, resetting...', error);
    return getDefaultSettings();
  }
}

function saveSettings(value) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not persist settings', error);
  }
}

function persistSettings() {
  saveSettings({
    volume: masterVolume,
    audioEnabled,
    musicEnabled,
    effectsEnabled: state.effectsEnabled,
    statsEnabled,
    sensitivity: mouseSensitivity,
    difficulty: state.difficulty,
    crosshairSize,
    crosshairColor,
    musicVolume,
  });
}

function applySettings(raw, { persist = true } = {}) {
  const normalized = normalizeSettings(raw);
  audioEnabled = normalized.audioEnabled;
  masterVolume = normalized.volume;
  musicEnabled = normalized.musicEnabled;
  musicVolume = normalized.musicVolume;
  mouseSensitivity = normalized.sensitivity;
  crosshairSize = normalized.crosshairSize;
  crosshairColor = normalized.crosshairColor;
  statsEnabled = normalized.statsEnabled;
  state.effectsEnabled = normalized.effectsEnabled;
  const difficulty = difficulties[normalized.difficulty] ? normalized.difficulty : 'normal';
  state.difficulty = difficulty;
  if (difficultySelect && difficultySelect.value !== difficulty) {
    difficultySelect.value = difficulty;
  }
  if (!state.effectsEnabled) {
    state.screenShake = 0;
    state.hurtFlash = 0;
  }
  refreshAudioUi();
  refreshEffectsUi();
  refreshSensitivityUi();
  refreshCrosshairUi();
  refreshStatsUi();
  if (!musicEnabled || !audioEnabled) {
    stopMusic();
  } else if (state.running && !state.paused) {
    setMusicIntensity(getMusicIntensityForWave(state.waveIndex));
  }
  if (persist) {
    persistSettings();
  }
}

function createDefaultBestRuns() {
  return Object.keys(difficulties).reduce((acc, key) => {
    acc[key] = { score: 0, kills: 0, waves: 0, time: 0 };
    return acc;
  }, {});
}

function loadBestRuns() {
  try {
    const saved = localStorage.getItem(BEST_RUNS_KEY);
    if (!saved) return createDefaultBestRuns();
    const parsed = JSON.parse(saved);
    return { ...createDefaultBestRuns(), ...parsed };
  } catch (error) {
    console.warn('Could not load best runs, resetting...', error);
    return createDefaultBestRuns();
  }
}

function saveBestRuns(value) {
  try {
    localStorage.setItem(BEST_RUNS_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not persist best runs', error);
  }
}

let bestRuns = loadBestRuns();

const savedSettings = loadSettings();
const savedDifficulty = difficulties[savedSettings.difficulty] ? savedSettings.difficulty : 'normal';

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}m ${secs}s`;
}

function renderBestRuns() {
  if (!bestRunsContainer) return;
  bestRunsContainer.innerHTML = Object.entries(difficulties)
    .map(([key, def]) => {
      const entry = bestRuns[key] || { score: 0, kills: 0, waves: 0, time: 0 };
      const hasData = entry.score > 0 || entry.kills > 0 || entry.waves > 0 || entry.time > 0;
      const bestScore = hasData ? Math.round(entry.score) : '—';
      const bestWaves = hasData ? entry.waves : '—';
      const bestKills = hasData ? entry.kills : '—';
      const bestTime = hasData && entry.time > 0 ? formatDuration(entry.time) : '—';
      return `
        <div class="best-row">
          <div class="best-label">${def.label}</div>
          <div class="best-stat"><span>Score</span><strong>${bestScore}</strong></div>
          <div class="best-stat"><span>Waves</span><strong>${bestWaves}</strong></div>
          <div class="best-stat"><span>Kills</span><strong>${bestKills}</strong></div>
          <div class="best-stat"><span>Fastest clear</span><strong>${bestTime}</strong></div>
        </div>
      `;
    })
    .join('');
}

function updateBestRuns(difficulty, stats) {
  const entry = bestRuns[difficulty] || { score: 0, kills: 0, waves: 0, time: 0 };
  let changed = false;
  if (stats.score > entry.score) {
    entry.score = stats.score;
    changed = true;
  }
  if (stats.kills > entry.kills) {
    entry.kills = stats.kills;
    changed = true;
  }
  if (stats.waves > entry.waves) {
    entry.waves = stats.waves;
    changed = true;
  }
  if (stats.victory && stats.time > 0 && (entry.time === 0 || stats.time < entry.time)) {
    entry.time = stats.time;
    changed = true;
  }
  if (changed) {
    bestRuns[difficulty] = entry;
    saveBestRuns(bestRuns);
    renderBestRuns();
  }
}

const WAVE_INTERMISSION_MS = 1200;

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
  difficulty: savedDifficulty,
  startTime: 0,
  screenShake: 0,
  hurtFlash: 0,
  effectsEnabled: savedSettings.effectsEnabled ?? true,
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
    Knife: Infinity,
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
  Knife: {
    fireRate: 2.4,
    damage: 50,
    color: '#fcd34d',
    ammoKey: 'Knife',
    melee: true,
    range: 70,
  },
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

const weaponSlots = [
  'Revolver',
  'Shotgun',
  'Tommy Gun',
  'Rocket Launcher',
  'Laser Gun',
  'Cannon',
  'Double-Barrel',
  'Knife',
];

const enemyTypes = {
  Gnaar: {
    radius: 13,
    speed: 120,
    damage: 20,
    health: 42,
    color: '#9ca3af',
  },
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
  { type: 'Gnaar', count: 8 },
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

function getMusicIntensityForWave(index) {
  const wave = waves[index];
  if (!wave) return 'calm';
  if (wave.type === 'UghZan') return 'boss';
  if (index >= 7) return 'combat';
  if (index >= 4) return 'build';
  return 'calm';
}

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
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth, clientHeight } = canvas;
  const width = Math.floor(clientWidth * dpr);
  const height = Math.floor(clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  state.width = clientWidth;
  state.height = clientHeight;
  input.mouse.x = clamp(input.mouse.x, 0, state.width);
  input.mouse.y = clamp(input.mouse.y, 0, state.height);
  setCrosshairPosition(input.mouse.x, input.mouse.y);
}

function screenToWorld(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: x - rect.left,
    y: y - rect.top,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeColor(value, fallback = '#ffffff') {
  if (typeof value !== 'string') return fallback;
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : fallback;
}

function hexToRgba(hex, alpha = 1) {
  const sanitized = normalizeColor(hex, '#ffffff');
  const numeric = parseInt(sanitized.slice(1), 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCurrentCrosshairColor() {
  const now = performance.now();
  if (crosshairFlashColor && crosshairFlashUntil > now) {
    return crosshairFlashColor;
  }
  return crosshairColor;
}

function applyCrosshairStyle() {
  if (!crosshair) return;
  const activeColor = getCurrentCrosshairColor();
  crosshair.style.setProperty('--crosshair-size', `${crosshairSize}px`);
  crosshair.style.setProperty('--crosshair-color', hexToRgba(activeColor, 0.75));
  crosshair.style.setProperty('--crosshair-shadow', hexToRgba(activeColor, 0.35));
  setCrosshairPosition(input.mouse.x, input.mouse.y);
}

function flashCrosshair(type) {
  crosshairFlashColor = type === 'hurt' ? '#ef4444' : '#22c55e';
  crosshairFlashUntil = performance.now() + 160;
}

function addScreenShake(amount) {
  if (!state.effectsEnabled) return;
  state.screenShake = Math.min(1, state.screenShake + amount);
}

function setCrosshairPosition(x, y) {
  if (!crosshair) return;
  const half = crosshairSize / 2;
  crosshair.style.transform = `translate(${x - half}px, ${y - half}px)`;
}

function centerCrosshair() {
  input.mouse.x = state.width / 2;
  input.mouse.y = state.height / 2;
  setCrosshairPosition(input.mouse.x, input.mouse.y);
}

function setCrosshairVisible(visible) {
  if (!crosshair) return;
  crosshair.style.display = visible ? 'block' : 'none';
}

function isOverlayActive() {
  return overlay.classList.contains('visible') || pauseOverlay.classList.contains('visible');
}

function refreshCrosshairVisibility() {
  const visible = state.running && !isOverlayActive();
  setCrosshairVisible(visible);
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
  const wavesLeft = Math.max(0, waves.length - (state.waveIndex + 1));
  hud.remaining.textContent = wavesLeft.toFixed(0);
  hud.score.textContent = state.score.toFixed(0);
}

function getDamageMultiplier(now = performance.now()) {
  return now < state.buffs.seriousDamageUntil ? 2 : 1;
}

function getSpeedMultiplier(now = performance.now()) {
  return now < state.buffs.hasteUntil ? 1.25 : 1;
}

function updateBuffHud(now = performance.now()) {
  const buffs = [
    { key: 'serious', label: 'Serious Damage', until: state.buffs.seriousDamageUntil },
    { key: 'haste', label: 'Speed Boost', until: state.buffs.hasteUntil },
  ];

  const activeLabels = [];
  buffs.forEach(({ key, label, until }) => {
    const ui = buffHud[key];
    if (!ui?.root) return;
    const remaining = Math.max(0, until - now);
    if (remaining > 0) {
      activeLabels.push(label);
      const pct = Math.min(1, remaining / ui.duration);
      ui.fill.style.width = `${(pct * 100).toFixed(1)}%`;
      ui.timer.textContent = `${Math.ceil(remaining / 1000)}s`;
      ui.root.classList.add('active');
    } else {
      ui.fill.style.width = '0%';
      ui.timer.textContent = '0s';
      ui.root.classList.remove('active');
    }
  });

  return activeLabels;
}

function updateBossHud() {
  if (!bossHud.root) return;
  const boss = enemies.find((enemy) => enemy.type === 'UghZan');
  if (boss) {
    bossHud.root.classList.add('visible');
    bossHud.label.textContent = 'Ugh-Zan III';
    const maxHealth = boss.maxHealth || boss.health || 1;
    const pct = Math.max(0, Math.min(1, boss.health / maxHealth));
    bossHud.fill.style.width = `${(pct * 100).toFixed(1)}%`;
  } else {
    bossHud.root.classList.remove('visible');
  }
}

function updateStatsHud(frameMs) {
  if (!statsEnabled || !statsReadout) return;
  frameTimes.push(frameMs);
  if (frameTimes.length > 120) frameTimes.shift();
  const avg = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  const fps = avg > 0 ? 1000 / avg : 0;
  statsReadout.textContent = `${fps.toFixed(0)} FPS (${avg.toFixed(1)} ms)`;
}

function updateStatusHud(now = performance.now()) {
  const labels = [];

  if (state.waveDelayUntil && state.waveDelayUntil > now) {
    const seconds = Math.max(0, (state.waveDelayUntil - now) / 1000);
    labels.push(`Next wave in ${seconds.toFixed(1)}s`);
  }

  labels.push(...updateBuffHud(now));
  hud.status.textContent = labels.length ? labels.join(' • ') : 'None';
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
  const size = crosshairSize * 0.45;
  const stroke = hexToRgba(getCurrentCrosshairColor(), 0.7);
  ctx.save();
  ctx.translate(input.mouse.x, input.mouse.y);
  ctx.strokeStyle = stroke;
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

  if (weapon.melee) {
    const now = performance.now();
    const damage = weapon.damage * getDamageMultiplier(now);
    const hits = [];
    enemies.forEach((enemy, index) => {
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist <= weapon.range + enemy.radius) {
        hits.push(index);
      }
    });

    let anyKill = false;
    for (let i = hits.length - 1; i >= 0; i -= 1) {
      const idx = hits[i];
      const target = enemies[idx];
      target.health -= damage;
      explosions.push({
        x: target.x,
        y: target.y,
        radius: weapon.range * 0.4,
        life: 0.12,
        maxLife: 0.12,
      });
      if (target.health <= 0) {
        registerKill(target.type);
        enemies.splice(idx, 1);
        anyKill = true;
      }
    }

    lastShotTime = timestamp;
    playSfx('knife');
    if (hits.length > 0) {
      flashCrosshair('hit');
    }
    if (anyKill) {
      updateStatusHud(timestamp);
      updateHud();
    }
    return;
  }

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
  if (player.weapon === 'Revolver') {
    playSfx('revolver');
  } else if (player.weapon === 'Shotgun' || player.weapon === 'Double-Barrel') {
    playSfx('shotgun');
  } else if (player.weapon === 'Tommy Gun') {
    playSfx('tommy');
  } else if (player.weapon === 'Rocket Launcher') {
    playSfx('rocket');
  } else if (player.weapon === 'Laser Gun') {
    playSfx('laser');
  } else if (player.weapon === 'Cannon') {
    playSfx('cannon');
  }
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

  const settings = getDifficultySettings();
  const scaledHealth = Math.round(definition.health * settings.enemyHealth);
  const scaledDamage = Math.round(definition.damage * settings.enemyDamage);
  const scaledSpeed = definition.speed * settings.enemySpeed;

  enemies.push({
    type,
    x,
    y,
    radius: definition.radius,
    speed: scaledSpeed,
    damage: scaledDamage,
    health: scaledHealth,
    maxHealth: scaledHealth,
    color: definition.color,
    lastShot: 0,
    nextDive: performance.now() + 1200 + Math.random() * 1400,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
  });
}

function spawnWave(index) {
  const wave = waves[index];
  if (!wave) return;
  setMusicIntensity(getMusicIntensityForWave(index));
  const settings = getDifficultySettings();
  const primaryCount = Math.max(1, Math.round(wave.count * settings.enemyCount));
  for (let i = 0; i < primaryCount; i += 1) {
    spawnEnemy(wave.type);
  }
  if (wave.bonus) {
    const bonusCount = Math.max(1, Math.round(wave.bonus.count * settings.enemyCount));
    for (let i = 0; i < bonusCount; i += 1) {
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

function applyScreenShake(delta) {
  if (!state.effectsEnabled) {
    state.screenShake = 0;
    return;
  }
  if (state.screenShake <= 0) return;
  const magnitude = state.screenShake * 8;
  const offsetX = (Math.random() - 0.5) * magnitude;
  const offsetY = (Math.random() - 0.5) * magnitude;
  ctx.translate(offsetX, offsetY);
  state.screenShake = Math.max(0, state.screenShake - delta * 2);
}

function drawDamageOverlays(delta) {
  if (state.effectsEnabled && state.hurtFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 64, 64, ${Math.min(0.6, state.hurtFlash) * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    state.hurtFlash = Math.max(0, state.hurtFlash - delta * 1.8);
  } else if (!state.effectsEnabled) {
    state.hurtFlash = 0;
  }

  const lowHealthRatio = Math.max(0, 1 - player.health / 40);
  if (lowHealthRatio > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(160, 0, 0, ${0.18 * lowHealthRatio})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function render(delta) {
  resizeCanvas();
  ctx.save();
  applyScreenShake(delta);
  drawBackdrop(delta);
  drawPickups();
  drawPlayer();
  drawBullets(delta);
  drawExplosions();
  drawEnemyProjectiles();
  drawShockwaves();
  drawEnemies();
  ctx.restore();
  applyCrosshairStyle();
  drawCrosshair();
  drawDamageOverlays(delta);
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
  playSfx('hurt');
  flashCrosshair('hurt');
  if (state.effectsEnabled) {
    state.hurtFlash = Math.min(1, state.hurtFlash + 0.6);
    addScreenShake(0.35);
  } else {
    state.hurtFlash = 0;
  }
  if (player.health <= 0) {
    endRun(false);
  }
}

function registerKill(type) {
  const scores = {
    Gnaar: 18,
    Kamikaze: 25,
    Kleer: 40,
    BioMech: 55,
    Werebull: 80,
    Harpy: 45,
    Reptiloid: 70,
    UghZan: 500,
  };
  state.kills += 1;
  const multiplier = getDifficultySettings().scoreMultiplier ?? 1;
  state.score += (scores[type] ?? 30) * multiplier;
  updateHud();
}

function detonate(bullet, x, y) {
  if (!bullet.explosionRadius) return false;
  explosions.push({ x, y, radius: bullet.explosionRadius, life: 0.25, maxLife: 0.25 });
  playSfx('explosion');
  addScreenShake(0.25);
  const damage = bullet.damage * getDamageMultiplier();
  let hitEnemy = false;

  for (let j = enemies.length - 1; j >= 0; j -= 1) {
    const enemy = enemies[j];
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist <= enemy.radius + bullet.explosionRadius) {
      enemy.health -= damage;
      hitEnemy = true;
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

  return hitEnemy;
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
        const hitSomething = detonate(bullet, bullet.x, bullet.y);
        if (hitSomething) {
          flashCrosshair('hit');
        }
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
          const hitSomething = detonate(bullet, bullet.x, bullet.y);
          if (hitSomething) {
            flashCrosshair('hit');
          }
        } else {
          enemy.health -= bullet.damage * damageMultiplier;
          if (enemy.health <= 0) {
            registerKill(enemy.type);
            enemies.splice(j, 1);
          }
          flashCrosshair('hit');
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
        playSfx('enemyFire');
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
        playSfx('enemyFire');
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
        playSfx('enemyFire');
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
        playSfx('enemyFire');
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
      state.waveDelayUntil = performance.now() + WAVE_INTERMISSION_MS;
      setMusicIntensity('calm');
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
        if (pickup.type === 'serious' || pickup.type === 'haste') {
          playSfx('buff');
        } else {
          playSfx('pickup');
        }
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
  stopMusic();
  updateStatusHud();
  updateBossHud();
  updateHud();
  overlayTitle.textContent = victory ? 'Victory!' : 'Garo has fallen';
  overlayDescription.textContent = victory
    ? 'You felled Ugh-Zan III and survived the full gauntlet. Continue the fight soon.'
    : 'Enemies overwhelmed Garo. Try again to push further.';
  const settings = getDifficultySettings();
  const wavesCleared = Math.min(waves.length, state.waveIndex + (enemies.length === 0 ? 1 : 0));
  const elapsed = Math.max(0, Math.round((performance.now() - state.startTime) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  updateBestRuns(state.difficulty, {
    score: Math.round(state.score),
    kills: state.kills,
    waves: wavesCleared,
    time: elapsed,
    victory,
  });
  overlaySummary.innerHTML = `
    <div><strong>Difficulty:</strong> ${settings.label}</div>
    <div><strong>Score:</strong> ${Math.round(state.score)}</div>
    <div><strong>Kills:</strong> ${state.kills}</div>
    <div><strong>Waves cleared:</strong> ${wavesCleared} / ${waves.length}</div>
    <div><strong>Time:</strong> ${minutes}m ${seconds}s</div>
  `;
  overlaySummary.classList.add('visible');
  startButton.textContent = 'Restart';
  overlay.classList.add('visible');
  refreshCrosshairVisibility();
}

function loop(timestamp) {
  if (!state.running || state.paused) return;
  const frameMs = Math.max(0, timestamp - state.lastTime);
  const delta = Math.min(0.1, frameMs / 1000);
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
  updateBossHud();
  render(delta);
  updateStatsHud(frameMs);
  requestAnimationFrame(loop);
}

function startGame() {
  ensureAudioContext();
  state.running = true;
  state.paused = false;
  state.lastTime = performance.now();
  state.startTime = state.lastTime;
  state.waveIndex = 0;
  state.waveDelayUntil = null;
  state.score = 0;
  state.kills = 0;
  state.difficulty = difficultySelect?.value ?? 'normal';
  state.buffs.seriousDamageUntil = 0;
  state.buffs.hasteUntil = 0;
  frameTimes = [];
  updateStatusHud();
  updateBossHud();
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
  overlaySummary.textContent = '';
  overlaySummary.classList.remove('visible');
  startButton.textContent = 'Start';
  centerCrosshair();
  refreshCrosshairVisibility();
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
  const settings = getDifficultySettings();
  player.health = settings.playerHealth;
  player.armor = settings.playerArmor;
  player.x = state.width / 2;
  player.y = state.height * 0.65;
  player.weapon = 'Revolver';
  player.ammoPools.Knife = Infinity;
  player.ammoPools.Revolver = Infinity;
  player.ammoPools.Shotgun = 20;
  player.ammoPools['Tommy Gun'] = 120;
  player.ammoPools['Rocket Launcher'] = 6;
  player.ammoPools['Laser Gun'] = 80;
  player.ammoPools.Cannon = 3;
  setMusicIntensity(getMusicIntensityForWave(state.waveIndex));
  spawnWave(state.waveIndex);
  spawnPickup('shells');
  spawnPickup('smg');
  spawnPickup('rockets');
  spawnPickup('cells');
  spawnPickup('cannonballs');
  updateHud();
  updateStatusHud();
  updateStatsHud(0);
  requestAnimationFrame(loop);
}

function pauseGame() {
  if (!state.running) return;
  state.paused = true;
  pauseOverlay.classList.add('visible');
  stopMusic();
  refreshCrosshairVisibility();
}

function resumeGame() {
  if (!state.running) return;
  ensureAudioContext();
  state.paused = false;
  pauseOverlay.classList.remove('visible');
  state.lastTime = performance.now();
  centerCrosshair();
  refreshCrosshairVisibility();
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
  setMusicIntensity(getMusicIntensityForWave(state.waveIndex));
  frameTimes = [];
  updateStatsHud(0);
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

function handlePointerLockChange() {
  const locked = document.pointerLockElement === canvas;
  if (gameRoot) {
    gameRoot.classList.toggle('locked', locked);
  }
  if (locked) {
    centerCrosshair();
  }
  refreshCrosshairVisibility();
}

function switchWeapon(slot) {
  const slotIndex = slot - 1;
  if (slotIndex < 0 || slotIndex >= weaponSlots.length) return;
  player.weapon = weaponSlots[slotIndex];
  updateHud();
}

function cycleWeapon(direction) {
  const currentIndex = weaponSlots.indexOf(player.weapon);
  const nextIndex = (currentIndex + direction + weaponSlots.length) % weaponSlots.length;
  player.weapon = weaponSlots[nextIndex];
  updateHud();
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
  if (event.code === 'Digit8' || event.code === 'Numpad8') {
    switchWeapon(8);
    return;
  }
  if (event.code === 'KeyQ') {
    cycleWeapon(-1);
    return;
  }
  if (event.code === 'KeyE') {
    cycleWeapon(1);
    return;
  }

  input.keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  input.keys.delete(event.code);
});

window.addEventListener(
  'wheel',
  (event) => {
    if (!state.running || state.paused) return;
    if (Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    cycleWeapon(event.deltaY > 0 ? 1 : -1);
  },
  { passive: false },
);

window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === canvas) {
    input.mouse.x = clamp(input.mouse.x + event.movementX * mouseSensitivity, 0, state.width);
    input.mouse.y = clamp(input.mouse.y + event.movementY * mouseSensitivity, 0, state.height);
  } else {
    const { x, y } = screenToWorld(event.clientX, event.clientY);
    input.mouse.x = x;
    input.mouse.y = y;
  }
  setCrosshairPosition(input.mouse.x, input.mouse.y);
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

window.addEventListener('resize', resizeCanvas);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running && !state.paused) {
    pauseGame();
  }
});

document.addEventListener('pointerlockchange', handlePointerLockChange);
canvas.addEventListener('click', () => {
  if (state.running && !state.paused && canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
});

startButton?.addEventListener('click', startGame);
resumeButton?.addEventListener('click', resumeGame);
fullscreenButton?.addEventListener('click', toggleFullscreen);
function resetBestRuns() {
  bestRuns = createDefaultBestRuns();
  saveBestRuns(bestRuns);
  renderBestRuns();
}

resetProgressButton?.addEventListener('click', resetBestRuns);
function resetSettings() {
  applySettings(getDefaultSettings());
}

resetSettingsButton?.addEventListener('click', resetSettings);
audioButton.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  refreshAudioUi();
  if (audioEnabled) {
    ensureAudioContext();
    if (state.running && !state.paused) {
      setMusicIntensity(getMusicIntensityForWave(state.waveIndex));
    }
  } else {
    stopMusic();
  }
  persistSettings();
});

musicButton?.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  refreshAudioUi();
  if (musicEnabled) {
    if (audioEnabled && state.running && !state.paused) {
      setMusicIntensity(getMusicIntensityForWave(state.waveIndex));
    }
  } else {
    stopMusic();
  }
  persistSettings();
});

effectsButton?.addEventListener('click', () => {
  state.effectsEnabled = !state.effectsEnabled;
  if (!state.effectsEnabled) {
    state.screenShake = 0;
    state.hurtFlash = 0;
  }
  refreshEffectsUi();
  persistSettings();
});
statsButton?.addEventListener('click', () => {
  statsEnabled = !statsEnabled;
  frameTimes = [];
  updateStatsHud(0);
  refreshStatsUi();
  persistSettings();
});
volumeSlider?.addEventListener('input', (event) => {
  const value = Number(event.target.value) / 100;
  setVolume(value);
});

musicVolumeSlider?.addEventListener('input', (event) => {
  const value = Number(event.target.value) / 100;
  setMusicVolume(value);
});

sensitivitySlider?.addEventListener('input', (event) => {
  const value = Number(event.target.value) / 100;
  setSensitivity(value);
});

crosshairSizeSlider?.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  setCrosshairSize(value);
});

crosshairColorInput?.addEventListener('input', (event) => {
  setCrosshairColor(event.target.value);
});

difficultySelect?.addEventListener('change', (event) => {
  const value = event.target.value;
  if (!difficulties[value]) return;
  state.difficulty = value;
  persistSettings();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (overlay?.classList.contains('visible')) {
    event.preventDefault();
    startGame();
  } else if (pauseOverlay?.classList.contains('visible')) {
    event.preventDefault();
    resumeGame();
  }
});

applySettings(savedSettings, { persist: false });
resizeCanvas();
updateHud();
renderBestRuns();
centerCrosshair();
refreshCrosshairVisibility();
refreshAudioUi();
refreshEffectsUi();
refreshSensitivityUi();
refreshCrosshairUi();
refreshStatsUi();
