const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('status');
const flashMessageEl = document.getElementById('flashMessage');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');

const PLAYER_SIZE = 28;
const BASE_ENEMY_SPEED = 1.8;
const BEST_SCORE_KEY = 'dodgeGameBestScore';

let gameState = 'ready';
let player;
let enemies;
let powerups;
let keys = {};
let touchInput = { x: 0, y: 0 };
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
let level = 1;
let baseEnemyCount = 3;
let speedScale = 1;
let lastTime = 0;
let spawnAccumulator = 0;
let powerupAccumulator = 0;
let levelAccumulator = 0;
let effectTimer = 0;
let activeEffect = null;

bestScoreEl.textContent = String(bestScore);

function resetGame() {
  player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height / 2 - PLAYER_SIZE / 2,
    size: PLAYER_SIZE,
    speed: 4.2,
    invincible: false,
  };

  enemies = [];
  powerups = [];
  score = 0;
  level = 1;
  baseEnemyCount = 3;
  speedScale = 1;
  spawnAccumulator = 0;
  powerupAccumulator = 0;
  levelAccumulator = 0;
  effectTimer = 0;
  activeEffect = null;

  for (let i = 0; i < baseEnemyCount; i += 1) spawnEnemy();
  updateHUD();
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) { x = Math.random() * canvas.width; y = -20; }
  if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
  if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; }
  if (side === 3) { x = -20; y = Math.random() * canvas.height; }

  const angle = Math.atan2(player.y - y, player.x - x) + (Math.random() - 0.5) * 0.8;
  const speed = (BASE_ENEMY_SPEED + Math.random() * 1.4) * speedScale;

  enemies.push({ x, y, r: 10 + Math.random() * 8, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
}

function spawnPowerup() {
  powerups.push({
    x: 30 + Math.random() * (canvas.width - 60),
    y: 30 + Math.random() * (canvas.height - 60),
    r: 12,
    type: Math.random() > 0.5 ? 'invincible' : 'slow',
    ttl: 8,
  });
}

function updateHUD() {
  scoreEl.textContent = String(Math.floor(score));
  bestScoreEl.textContent = String(bestScore);
  levelEl.textContent = String(level);
  statusEl.textContent =
    gameState === 'running' ? (activeEffect ? `进行中（${activeEffect}）` : '进行中') : gameState === 'paused' ? '暂停中' : gameState === 'over' ? '已结束' : '待开始';
}

function showFlash(msg) {
  flashMessageEl.textContent = msg;
  flashMessageEl.classList.add('show');
  setTimeout(() => flashMessageEl.classList.remove('show'), 900);
}

function startGame() {
  if (gameState === 'running') return;
  if (gameState === 'ready' || gameState === 'over') resetGame();
  gameState = 'running';
  updateHUD();
}

function pauseGame() {
  if (gameState === 'running') gameState = 'paused';
  else if (gameState === 'paused') gameState = 'running';
  updateHUD();
}

function endGame() {
  gameState = 'over';
  if (score > bestScore) {
    bestScore = Math.floor(score);
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    showFlash('🎉 新纪录！');
  }
  updateHUD();
}

function getInputVector() {
  let dx = 0;
  let dy = 0;
  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;

  dx += touchInput.x;
  dy += touchInput.y;

  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function collideCircleRect(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.size));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.size));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function update(dt) {
  if (gameState !== 'running') return;

  score += dt * 10;
  spawnAccumulator += dt;
  powerupAccumulator += dt;
  levelAccumulator += dt;

  if (spawnAccumulator > 1.6) {
    spawnAccumulator = 0;
    spawnEnemy();
  }

  if (powerupAccumulator > 7 + Math.random() * 2) {
    powerupAccumulator = 0;
    spawnPowerup();
  }

  if (levelAccumulator > 14) {
    levelAccumulator = 0;
    level += 1;
    speedScale += 0.18;
    spawnEnemy();
    showFlash(`⚠️ 难度提升 Lv.${level}`);
  }

  if (effectTimer > 0) {
    effectTimer -= dt;
    if (effectTimer <= 0) {
      player.invincible = false;
      activeEffect = null;
      speedScale = 1 + (level - 1) * 0.18;
    }
  }

  const input = getInputVector();
  player.x += input.x * player.speed * 120 * dt;
  player.y += input.y * player.speed * 120 * dt;
  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

  enemies.forEach((e) => {
    e.x += e.vx;
    e.y += e.vy;
    e.vx *= 0.998;
    e.vy *= 0.998;

    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.vx += Math.cos(angle) * 0.02 * speedScale;
    e.vy += Math.sin(angle) * 0.02 * speedScale;

    if (collideCircleRect(e, player) && !player.invincible) endGame();
  });

  powerups = powerups.filter((p) => {
    p.ttl -= dt;
    if (p.ttl <= 0) return false;

    if (collideCircleRect(p, player)) {
      if (p.type === 'invincible') {
        player.invincible = true;
        activeEffect = '无敌';
        effectTimer = 4.5;
        showFlash('🛡️ 无敌启动');
      } else {
        activeEffect = '敌人减速';
        effectTimer = 4.5;
        speedScale *= 0.58;
        enemies.forEach((e) => { e.vx *= 0.58; e.vy *= 0.58; });
        showFlash('🐢 敌人减速');
      }
      return false;
    }

    return true;
  });

  updateHUD();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const glow = 8 + Math.sin(Date.now() * 0.01) * 4;
  ctx.save();
  ctx.shadowBlur = glow;
  ctx.shadowColor = '#50d3ff';
  ctx.fillStyle = player.invincible ? '#7dffac' : '#59c4ff';
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.restore();

  enemies.forEach((e) => {
    ctx.beginPath();
    ctx.fillStyle = '#ff4f64';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff4f64';
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  });

  powerups.forEach((p) => {
    ctx.beginPath();
    ctx.fillStyle = p.type === 'invincible' ? '#51ffa8' : '#8fff4d';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#7fff8d';
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.033);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function updateJoystick(clientX, clientY) {
  const rect = joystickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const maxR = rect.width * 0.35;
  const len = Math.hypot(dx, dy);
  const clamp = len > maxR ? maxR / len : 1;

  const px = dx * clamp;
  const py = dy * clamp;

  joystickKnob.style.transform = `translate(${px}px, ${py}px)`;
  touchInput.x = px / maxR;
  touchInput.y = py / maxR;
}

joystickBase.addEventListener('pointerdown', (e) => {
  joystickBase.setPointerCapture(e.pointerId);
  updateJoystick(e.clientX, e.clientY);
});
joystickBase.addEventListener('pointermove', (e) => {
  if (e.pressure === 0) return;
  updateJoystick(e.clientX, e.clientY);
});
joystickBase.addEventListener('pointerup', () => {
  joystickKnob.style.transform = 'translate(0, 0)';
  touchInput.x = 0;
  touchInput.y = 0;
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', () => {
  gameState = 'ready';
  resetGame();
  showFlash('🔄 已重置');
});

resetGame();
updateHUD();
requestAnimationFrame(loop);
