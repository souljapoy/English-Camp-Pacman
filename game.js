const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* =========================
   ASSETS
========================= */

const kokkyImg = new Image();
kokkyImg.src = "kokky.png";

const woodImg = new Image();
woodImg.src = "wood.png";

const mountainImg = new Image();
mountainImg.src = "mountains.png";

const steamImg = new Image();
steamImg.src = "steam.png";

/* =========================
   GAME STATE
========================= */

let gameOver = false;
let score = 0;
let best = 0;
let speed = 2.6;

/* =========================
   PLAYER
========================= */

const player = {
  x: 120,
  y: canvas.height / 2,
  vy: 0,
  gravity: 0.45,
  jump: -7.5,
  w: 36,
  h: 36
};

function resetGame() {
  player.y = canvas.height / 2;
  player.vy = 0;
  score = 0;
  pipes.length = 0;
  spawnPipe();
}

/* =========================
   INPUT
========================= */

function handleInput() {
  if (gameOver) {
    gameOver = false;
    resetGame();
    return;
  }
  player.vy = player.jump;
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") handleInput();
});
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  handleInput();
});

/* =========================
   OBSTACLES
========================= */

const pipes = [];
const pipeGap = 170;
const pipeWidth = 56;

function spawnPipe() {
  const center =
    160 + Math.random() * (canvas.height - 320);

  pipes.push({
    x: canvas.width + 40,
    top: center - pipeGap / 2,
    bottom: center + pipeGap / 2,
    scored: false
  });
}

setInterval(() => {
  if (!gameOver) spawnPipe();
}, 1600);

/* =========================
   STARS + SNOW
========================= */

const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 1.6 + 0.4,
  c: Math.random() < 0.7 ? "#ffe9a8" : "#ffffff"
}));

const snow = Array.from({ length: 90 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 1.4 + 0.6,
  v: Math.random() * 0.6 + 0.3
}));

/* =========================
   DRAW BACKGROUND
========================= */

function drawMoon() {
  const mx = canvas.width - 90;
  const my = 120;
  const r = 42;

  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.fillStyle = "#f1e3b0";
  ctx.shadowColor = "#f1e3b0";
  ctx.shadowBlur = 24;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.arc(mx - 10, my - 6, 6, 0, Math.PI * 2);
  ctx.arc(mx + 6, my + 4, 9, 0, Math.PI * 2);
  ctx.arc(mx + 2, my - 14, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0a1230");
  grad.addColorStop(1, "#02040b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  drawMoon();

  snow.forEach(p => {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    p.y += p.v;
    if (p.y > canvas.height) p.y = -5;
  });

  ctx.drawImage(
    mountainImg,
    0,
    canvas.height - 260,
    canvas.width,
    120
  );

  ctx.drawImage(
    steamImg,
    0,
    canvas.height - 140,
    canvas.width,
    140
  );
}

/* =========================
   DRAW PLAYER
========================= */

function drawPlayer() {
  ctx.drawImage(
    kokkyImg,
    player.x,
    player.y,
    player.w,
    player.h
  );

  ctx.globalAlpha = 0.35;
  ctx.drawImage(
    steamImg,
    player.x - 8,
    player.y + player.h - 4,
    40,
    14
  );
  ctx.globalAlpha = 1;
}

/* =========================
   DRAW PIPES
========================= */

function drawPipes() {
  pipes.forEach(p => {
    ctx.drawImage(
      woodImg,
      p.x,
      0,
      pipeWidth,
      p.top
    );
    ctx.drawImage(
      woodImg,
      p.x,
      p.bottom,
      pipeWidth,
      canvas.height - p.bottom
    );
  });
}

/* =========================
   COLLISION
========================= */

function hitPipe(p) {
  const hitX =
    player.x + 8 < p.x + pipeWidth &&
    player.x + player.w - 8 > p.x;

  const hitY =
    player.y + 6 < p.top ||
    player.y + player.h - 6 > p.bottom;

  return hitX && hitY;
}

/* =========================
   UPDATE
========================= */

function update() {
  player.vy += player.gravity;
  player.y += player.vy;

  pipes.forEach(p => {
    p.x -= speed;

    if (!p.scored && p.x + pipeWidth < player.x) {
      p.scored = true;
      score++;
      best = Math.max(best, score);
      document.getElementById("score").textContent = `Score: ${score}`;
      document.getElementById("best").textContent = `Best: ${best}`;
    }

    if (hitPipe(p)) gameOver = true;
  });

  if (player.y < -20 || player.y > canvas.height - 20) {
    gameOver = true;
  }

  while (pipes.length && pipes[0].x < -pipeWidth) {
    pipes.shift();
  }
}

/* =========================
   LOOP
========================= */

function loop() {
  drawBackground();
  drawPipes();
  drawPlayer();

  if (!gameOver) update();

  requestAnimationFrame(loop);
}

spawnPipe();
loop();
