/* =========================================
   KOKKY'S HOT SPRING HOP — FULL GAME LOGIC
   ========================================= */

// Canvas
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// DOM
const scoreSpan = document.getElementById("score");
const bestSpan = document.getElementById("best");
const playerIdLabel = document.getElementById("playerIdLabel");
const changePlayerBtn = document.getElementById("changePlayerBtn");
const overlay = document.getElementById("playerOverlay");
const numberList = document.getElementById("numberList");
const selectedPreview = document.getElementById("selectedPreview");
const confirmPlayerBtn = document.getElementById("confirmPlayerBtn");

// Images
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";

const mountainImg = new Image();
mountainImg.src = "mountains.png";

const steamImg = new Image();
steamImg.src = "steam.png";

const woodImg = new Image();
woodImg.src = "wood.png";

// Game state
let player = {
  x: 130,
  y: H / 2,
  vy: 0,
  w: 64,
  h: 64
};

let gravity = 0.55;
let jumpForce = -8.2;

let obstacles = [];
let gapSize = 170;  // vertical gap between top & bottom
let obstacleSpeed = 2.8;
let speedBoosted = false;

let score = 0;
let bestScore = parseInt(localStorage.getItem("bestScore") || "0", 10) || 0;
bestSpan.textContent = "Best: " + bestScore;

let isRunning = false;
let isGameOver = false;

// Background scroll
let bgOffset = 0;
let steamOffset = 0;

// Stars + snow
const stars = [];
for (let i = 0; i < 80; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * (H * 0.6),
    size: 1 + Math.random() * 2,
    yellow: Math.random() < 0.7
  });
}

const snowflakes = [];
for (let i = 0; i < 70; i++) {
  snowflakes.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1 + Math.random() * 2.2,
    vy: 0.35 + Math.random() * 0.7,
    drift: (Math.random() - 0.5) * 0.4
  });
}

// Player ID and team/number logic
let currentPlayerId = localStorage.getItem("currentPlayerId") || null;

// Master mapping from earlier list + A/B ALTs + Guest 0
const TEAM_NUMBERS = {
  W: ["5","8","9","18","19","22","28","29","30","34","A","B"],
  R: ["1","4","6","7","11","13","20","21","27","31","40","A","B"],
  G: ["10","12","14","23","24","26","35","36","37","39","A","B"],
  B: ["2","3","15","16","17","25","32","33","38","41","A","B"],
  Guest: ["0"]
};

function updatePlayerLabel() {
  playerIdLabel.textContent = currentPlayerId
    ? "Player: " + currentPlayerId
    : "Player: Not set";
}
updatePlayerLabel();

// Open overlay when "Change" is pressed
changePlayerBtn.addEventListener("click", () => {
  overlay.classList.remove("hidden");
});

// Team buttons
const teamButtons = document.querySelectorAll(".teamBtn");
let selectedTeam = null;
let selectedNumber = null;

teamButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    teamButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTeam = btn.dataset.team;
    selectedNumber = null;
    selectedPreview.textContent = "";
    buildNumberList();
  });
});

function buildNumberList() {
  numberList.innerHTML = "";
  const nums = TEAM_NUMBERS[selectedTeam] || [];

  nums.forEach((n) => {
    const button = document.createElement("button");
    // Show A/B as ALT label, but keep ID as letter
    if (n === "A") button.textContent = "A (ALT)";
    else if (n === "B") button.textContent = "B (ALT)";
    else if (n === "0" && selectedTeam === "Guest") button.textContent = "0 (Guest)";
    else button.textContent = n;

    button.addEventListener("click", () => {
      [...numberList.children].forEach(x => x.classList.remove("selected"));
      button.classList.add("selected");
      selectedNumber = n;
      selectedPreview.textContent =
        selectedTeam === "Guest"
          ? "Selected: Guest-0"
          : `Selected: ${selectedTeam}-${n}`;
    });

    numberList.appendChild(button);
  });
}

confirmPlayerBtn.addEventListener("click", () => {
  if (!selectedTeam || !selectedNumber) return;
  if (selectedTeam === "Guest") {
    currentPlayerId = "Guest-0";
  } else {
    currentPlayerId = `${selectedTeam}-${selectedNumber}`;
  }
  localStorage.setItem("currentPlayerId", currentPlayerId);
  updatePlayerLabel();
  overlay.classList.add("hidden");
});

// Ranks
function getRankTitle(s) {
  if (s >= 1000) return "Onsen God";
  if (s >= 500) return "Onsen Legend";
  if (s >= 250) return "King of the Onsen";
  if (s >= 100) return "Onsen Overlord";
  if (s >= 75) return "Steam Master";
  if (s >= 50) return "Onsen Ace";
  if (s >= 25) return "Steam Hopper";
  return "-";
}

// Rank banner (gold slide-down)
let rankBannerText = "";
let rankBannerTimer = 0;

function triggerRankBanner(title) {
  rankBannerText = title;
  rankBannerTimer = 90; // frames ~1.5s at 60fps
}

function drawRankBanner() {
  if (rankBannerTimer <= 0 || rankBannerText === "-") return;
  rankBannerTimer--;

  const alpha = Math.min(1, rankBannerTimer / 20);
  const bannerWidth = W * 0.8;
  const bannerHeight = 60;
  const x = (W - bannerWidth) / 2;
  const y = 40;

  ctx.save();
  ctx.globalAlpha = alpha;

  const grad = ctx.createLinearGradient(x, y, x + bannerWidth, y + bannerHeight);
  grad.addColorStop(0, "#ffe08a");
  grad.addColorStop(0.5, "#fffae1");
  grad.addColorStop(1, "#f5c34d");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, bannerWidth, bannerHeight, 12);
  ctx.fill();

  ctx.strokeStyle = "#8a5a00";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#3a2200";
  ctx.font = "24px Handjet";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Rank Up: " + rankBannerText, W / 2, y + bannerHeight / 2);

  ctx.restore();
}

// Scoreboard saving (per-player best)
function saveScoreToBoard() {
  if (!currentPlayerId) return;

  let board = [];
  try {
    board = JSON.parse(localStorage.getItem("scoreboard") || "[]");
  } catch {
    board = [];
  }

  let entry = board.find(e => e.id === currentPlayerId);
  const newRank = getRankTitle(score);

  if (!entry) {
    board.push({ id: currentPlayerId, score: score, rank: newRank });
  } else {
    if (score > entry.score) {
      entry.score = score;
      entry.rank = newRank;
    }
  }

  localStorage.setItem("scoreboard", JSON.stringify(board));
}

// Obstacles
function spawnObstacle() {
  const centerY = 230 + Math.random() * 240; // spread gaps
  const topH = centerY - gapSize / 2;
  const bottomY = centerY + gapSize / 2;
  const bottomH = (H - 120) - bottomY; // above steam

  obstacles.push({
    x: W + 40,
    w: 80,
    top: topH,
    bottomY: bottomY,
    bottomH: bottomH,
    passed: false
  });
}

// Moon — STABLE crater moon (no images, just drawing)
function drawMoon() {
  const cx = W - 100;
  const cy = 110;
  const r = 40;

  // Glow
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
  glow.addColorStop(0, "rgba(255, 240, 200, 0.9)");
  glow.addColorStop(1, "rgba(255, 240, 200, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  const body = ctx.createRadialGradient(cx - 10, cy - 10, 6, cx, cy, r);
  body.addColorStop(0, "#fff3c8");
  body.addColorStop(0.3, "#ffe2a3");
  body.addColorStop(1, "#d9b467");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Craters (fixed, not random — no jitter)
  const craters = [
    { x: -15, y: -5, size: 5 },
    { x:  10, y: -12, size: 4 },
    { x:  14, y:   4, size: 3 },
    { x:  -4, y:  14, size: 4 }
  ];

  ctx.fillStyle = "rgba(180,150,70,0.28)";
  craters.forEach(c => {
    ctx.beginPath();
    ctx.arc(cx + c.x, cy + c.y, c.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Background drawing
function drawBackground() {
  // Night sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#050b23");
  skyGrad.addColorStop(0.6, "#07122c");
  skyGrad.addColorStop(1, "#050b23");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  stars.forEach(s => {
    ctx.fillStyle = s.yellow ? "#ffe599" : "#f8f8ff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Snow
  snowflakes.forEach(f => {
    ctx.fillStyle = "rgba(240,240,255,0.9)";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();

    f.y += f.vy;
    f.x += f.drift;
    if (f.y > H) {
      f.y = -10;
      f.x = Math.random() * W;
    }
    if (f.x < -10) f.x = W + 10;
    if (f.x > W + 10) f.x = -10;
  });

  // Moon (static & behind obstacles)
  drawMoon();

  // Mountains (scrolling)
  ctx.drawImage(mountainImg, bgOffset, H - 220, W, 220);
  ctx.drawImage(mountainImg, bgOffset + W, H - 220, W, 220);
  bgOffset -= 0.4;
  if (bgOffset <= -W) bgOffset = 0;

  // Steam foreground
  ctx.drawImage(steamImg, steamOffset, H - 120, W, 120);
  ctx.drawImage(steamImg, steamOffset + W, H - 120, W, 120);
  steamOffset -= 1.2;
  if (steamOffset <= -W) steamOffset = 0;
}

// Obstacles drawing
function drawObstacles() {
  obstacles.forEach(o => {
    // Top bamboo
    ctx.drawImage(woodImg, o.x, 0, o.w, o.top);

    // Bottom bamboo
    ctx.drawImage(woodImg, o.x, o.bottomY, o.w, o.bottomH);
  });
}

// Player drawing
function drawPlayer() {
  if (kokkyImg.complete && kokkyImg.naturalWidth > 0) {
    ctx.drawImage(
      kokkyImg,
      player.x - player.w / 2,
      player.y - player.h / 2,
      player.w,
      player.h
    );
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(
      player.x - player.w / 2,
      player.y - player.h / 2,
      player.w,
      player.h
    );
  }
}

// Input
function tap() {
  if (!currentPlayerId) {
    overlay.classList.remove("hidden");
    return;
  }

  if (!isRunning) {
    startGame();
  } else if (!isGameOver) {
    player.vy = jumpForce;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    tap();
  }
});

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  tap();
});

// Game control
function startGame() {
  isRunning = true;
  isGameOver = false;
  score = 0;
  scoreSpan.textContent = "Score: 0";
  obstacles = [];
  player.y = H / 2;
  player.vy = 0;
  obstacleSpeed = 2.8;
  speedBoosted = false;
  spawnObstacle();
}

function endGame() {
  if (isGameOver) return;
  isGameOver = true;
  isRunning = false;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", String(bestScore));
  }
  bestSpan.textContent = "Best: " + bestScore;

  saveScoreToBoard();
}

// Main loop
function update() {
  // Physics
  if (isRunning && !isGameOver) {
    player.vy += gravity;
    player.y += player.vy;

    // floor (steam line)
    const floorY = H - 120 - player.h / 2;
    if (player.y > floorY) {
      player.y = floorY;
      endGame();
    }
    // ceiling
    if (player.y < player.h / 2) {
      player.y = player.h / 2;
      player.vy = 0;
    }

    obstacles.forEach(o => {
      o.x -= obstacleSpeed;

      // Score and speed bump
      if (!o.passed && o.x + o.w < player.x) {
        o.passed = true;
        score++;
        scoreSpan.textContent = "Score: " + score;

        // Speed bump once at 60
        if (!speedBoosted && score >= 60) {
          speedBoosted = true;
          obstacleSpeed += 0.7;
        }

        // Rank banner
        const rank = getRankTitle(score);
        if (rank !== "-" && rank !== rankBannerText) {
          triggerRankBanner(rank);
        }
      }
    });

    // Remove offscreen obstacles, spawn new
    if (obstacles.length && obstacles[0].x + obstacles[0].w < -50) {
      obstacles.shift();
      spawnObstacle();
    }

    // Collision with obstacles
    const px = player.x;
    const py = player.y;
    const hw = player.w / 2;
    const hh = player.h / 2;

    for (const o of obstacles) {
      const inX = px + hw > o.x && px - hw < o.x + o.w;
      if (inX) {
        if (py - hh < o.top || py + hh > o.bottomY) {
          endGame();
          break;
        }
      }
    }
  }

  // Drawing
  drawBackground();
  drawObstacles();
  drawPlayer();
  drawRankBanner();

  requestAnimationFrame(update);
}

update();
