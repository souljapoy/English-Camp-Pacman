// ===== CANVAS SETUP =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// DOM elements
const scoreSpan = document.getElementById("score");
const bestSpan = document.getElementById("best");
const playerIdLabel = document.getElementById("playerIdLabel");
const changePlayerBtn = document.getElementById("changePlayerBtn");
const overlay = document.getElementById("playerOverlay");
const teamButtonsContainer = document.getElementById("teamButtons");
const numberList = document.getElementById("numberList");
const selectedPreview = document.getElementById("selectedPreview");
const confirmPlayerBtn = document.getElementById("confirmPlayerBtn");

// ===== PLAYER ID / TEAMS =====

// Student-number mapping (your table)
const TEAM_NUMBERS = {
  W: [5, 8, 9, 18, 19, 22, 28, 29, 30, 34],
  R: [1, 4, 6, 7, 11, 13, 20, 21, 27, 31, 40],
  G: [10, 12, 14, 23, 24, 26, 35, 36, 37, 39],
  B: [2, 3, 15, 16, 17, 25, 32, 33, 38, 41],
};

// Rank thresholds & titles
const RANK_THRESHOLDS = [0, 25, 50, 75, 100, 250, 500, 1000];
const RANK_TITLES = [
  "Onsen Rookie",
  "Steam Hopper",
  "Onsen Ace",
  "Steam Master",
  "Onsen Overlord",
  "King of the Onsen",
  "Onsen Legend",
  "Onsen God",
];

let currentTeam = null;
let currentNumber = null;
let currentPlayerId = null;

// Load last used player
(function loadCurrentPlayer() {
  const saved = localStorage.getItem("kokkyCurrentPlayer");
  if (saved) {
    currentPlayerId = saved;
    playerIdLabel.textContent = "Player: " + currentPlayerId;
  }
})();

function showOverlay() {
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

function teamName(code) {
  switch (code) {
    case "W":
      return "White";
    case "R":
      return "Red";
    case "G":
      return "Green";
    case "B":
      return "Blue";
    case "Guest":
      return "Guest";
    default:
      return code;
  }
}

function setSelectedTeam(team) {
  currentTeam = team;
  currentNumber = null;

  document
    .querySelectorAll(".teamBtn")
    .forEach((btn) => btn.classList.remove("selected"));
  const btn = document.querySelector(`.teamBtn[data-team="${team}"]`);
  if (btn) btn.classList.add("selected");

  populateNumberList(team);
  updateSelectedPreview();
}

function populateNumberList(team) {
  numberList.innerHTML = "";

  if (team === "Guest") {
    const btn = document.createElement("button");
    btn.dataset.value = "0";
    btn.textContent = "0 (Guest)";
    btn.addEventListener("click", () => setSelectedNumber("0"));
    numberList.appendChild(btn);
    return;
  }

  const nums = TEAM_NUMBERS[team] || [];
  if (nums.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No numbers configured for this team.";
    numberList.appendChild(p);
    return;
  }

  nums.forEach((n) => {
    const btn = document.createElement("button");
    btn.dataset.value = String(n);
    btn.textContent = n;
    btn.addEventListener("click", () => setSelectedNumber(String(n)));
    numberList.appendChild(btn);
  });

  // ALTs A / B
  ["A", "B"].forEach((code) => {
    const btn = document.createElement("button");
    btn.dataset.value = code;
    btn.textContent = `${code} (ALT)`;
    btn.addEventListener("click", () => setSelectedNumber(code));
    numberList.appendChild(btn);
  });
}

function setSelectedNumber(val) {
  currentNumber = val;
  numberList
    .querySelectorAll("button")
    .forEach((btn) => btn.classList.remove("selected"));
  const btn = Array.from(numberList.querySelectorAll("button")).find(
    (b) => b.dataset.value === val
  );
  if (btn) btn.classList.add("selected");
  updateSelectedPreview();
}

function updateSelectedPreview() {
  if (!currentTeam) {
    selectedPreview.textContent = "No team selected.";
    return;
  }
  if (currentTeam === "Guest") {
    selectedPreview.textContent = "Selected: Guest";
    return;
  }
  if (!currentNumber) {
    selectedPreview.textContent = `Selected: ${teamName(currentTeam)} - ?`;
    return;
  }
  selectedPreview.textContent = `Selected: ${teamName(
    currentTeam
  )} - ${currentNumber}`;
}

confirmPlayerBtn.addEventListener("click", () => {
  if (!currentTeam) return;

  let id;
  if (currentTeam === "Guest") {
    id = "Guest";
  } else if (!currentNumber) {
    return;
  } else {
    id = `${currentTeam}-${currentNumber}`;
  }

  currentPlayerId = id;
  localStorage.setItem("kokkyCurrentPlayer", id);
  playerIdLabel.textContent = "Player: " + id;
  hideOverlay();
  resetGame();
});

teamButtonsContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("teamBtn")) {
    const team = e.target.dataset.team;
    setSelectedTeam(team);
  }
});

changePlayerBtn.addEventListener("click", () => {
  showOverlay();
});

if (!currentPlayerId) {
  showOverlay();
}

// ===== IMAGES =====

// Kokky sprite
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";
let kokkyReady = false;
kokkyImg.onload = () => {
  kokkyReady = true;
};

// Wood / bamboo obstacles
const woodImg = new Image();
woodImg.src = "wood.png";
let woodPattern = null;
woodImg.onload = () => {
  woodPattern = ctx.createPattern(woodImg, "repeat-y");
};

// Mountains band
const mountainsImg = new Image();
mountainsImg.src = "mountains.png";
let mountainsReady = false;
mountainsImg.onload = () => {
  mountainsReady = true;
};

// Steam band
const steamImg = new Image();
steamImg.src = "steam.png";
let steamReady = false;
steamImg.onload = () => {
  steamReady = true;
};

// ===== BACKGROUND PARTICLES =====
const stars = [];
const SNOW_COUNT = 60;
const snowflakes = [];

function initBackgroundParticles() {
  stars.length = 0;
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * (HEIGHT * 0.55),
      r: Math.random() * 1.3 + 0.7,
      color: Math.random() < 0.3 ? "#ffe9a9" : "#f5f5ff",
    });
  }

  snowflakes.length = 0;
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowflakes.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      r: Math.random() * 2 + 1,
      speed: Math.random() * 0.6 + 0.3,
    });
  }
}

initBackgroundParticles();

// ===== GAME STATE =====
const player = {
  x: WIDTH * 0.2,
  y: HEIGHT * 0.45,
  vy: 0,
  w: 60,
  h: 60,
};

const GRAVITY = 0.35;
const JUMP_VELOCITY = -6.6;

let obstacles = [];
const OBSTACLE_WIDTH = 80;
const GAP_HEIGHT = 190;
const OBSTACLE_SPACING = 260;

let baseSpeed = 2.7;
let speed = baseSpeed;
let speedBoosted = false;

let gameOver = false;
let score = 0;
let bestScoreForPlayer = 0;
let framesSinceStart = 0;
let lastRankIndex = 0;

const rankBanner = {
  visible: false,
  text: "",
  timer: 0,
};

function loadBestForPlayer() {
  bestScoreForPlayer = 0;
  if (!currentPlayerId) return;
  const raw = localStorage.getItem("kokkyScores");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const entry = data.find((e) => e.playerId === currentPlayerId);
    if (entry) bestScoreForPlayer = entry.highScore || 0;
  } catch (e) {
    console.error(e);
  }
  bestSpan.textContent = "Best: " + bestScoreForPlayer;
}

loadBestForPlayer();

function randomGapY() {
  const minY = HEIGHT * 0.25;
  const maxY = HEIGHT * 0.65;
  return minY + Math.random() * (maxY - minY);
}

function createInitialObstacles() {
  obstacles = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const x = WIDTH + i * OBSTACLE_SPACING;
    obstacles.push({ x, gapY: randomGapY(), counted: false });
  }
}

function resetGame() {
  player.y = HEIGHT * 0.45;
  player.vy = 0;
  score = 0;
  scoreSpan.textContent = "Score: 0";
  loadBestForPlayer();
  gameOver = false;
  framesSinceStart = 0;
  speed = baseSpeed;
  speedBoosted = false;
  lastRankIndex = getRankIndex(0);
  rankBanner.visible = false;
  createInitialObstacles();
}

resetGame();

// ===== INPUT =====
function doJump() {
  if (!currentPlayerId) {
    showOverlay();
    return;
  }
  if (gameOver) {
    resetGame();
    return;
  }
  player.vy = JUMP_VELOCITY;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    doJump();
  }
});

canvas.addEventListener("mousedown", () => doJump());
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  doJump();
});

// ===== RANK HELPERS =====
function getRankIndex(scoreVal) {
  let idx = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (scoreVal >= RANK_THRESHOLDS[i]) idx = i;
    else break;
  }
  return idx;
}

function maybeShowRankBanner(newScore) {
  const idx = getRankIndex(newScore);
  if (idx > lastRankIndex) {
    lastRankIndex = idx;
    if (idx > 0) {
      rankBanner.visible = true;
      rankBanner.text = RANK_TITLES[idx];
      rankBanner.timer = 90; // ~1.5 seconds
    }
  }
}

function saveScore(finalScore) {
  if (!currentPlayerId) return;
  const rankIndex = getRankIndex(finalScore);

  const raw = localStorage.getItem("kokkyScores");
  let data = [];
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(e);
      data = [];
    }
  }

  let entry = data.find((e) => e.playerId === currentPlayerId);
  if (!entry) {
    entry = { playerId: currentPlayerId, highScore: finalScore, bestRank: rankIndex };
    data.push(entry);
  } else {
    if (finalScore > entry.highScore) entry.highScore = finalScore;
    if (rankIndex > (entry.bestRank || 0)) entry.bestRank = rankIndex;
  }

  localStorage.setItem("kokkyScores", JSON.stringify(data));
}

// ===== BACKGROUND DRAWING =====

function drawMoon() {
  const cx = WIDTH * 0.78;
  const cy = HEIGHT * 0.19;
  const r = 48;

  // glow
  const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.4);
  glowGrad.addColorStop(0, "rgba(255,241,198,0.65)");
  glowGrad.addColorStop(1, "rgba(255,241,198,0.0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // disk
  const diskGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.15, cx, cy, r);
  diskGrad.addColorStop(0, "#fff2cf");
  diskGrad.addColorStop(1, "#e4cf98");
  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

// ---- ORIGINAL CRATER STYLE YOU APPROVED ----
const craterList = [
  { x: -0.28, y: -0.05, r: 0.22 },
  { x: 0.18, y: -0.02, r: 0.18 },
  { x: -0.05, y: 0.22, r: 0.15 }
];

craterList.forEach(c => {
  const cx2 = cx + c.x * r;
  const cy2 = cy + c.y * r;
  const rr = c.r * r;

  const g = ctx.createRadialGradient(cx2, cy2, rr * 0.1, cx2, cy2, rr);
  g.addColorStop(0, "rgba(210,185,130,0.9)");
  g.addColorStop(1, "rgba(140,120,90,0.25)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx2, cy2, rr, 0, Math.PI * 2);
  ctx.fill();
});
}

function drawBackground() {
  // night sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.7);
  skyGrad.addColorStop(0, "#05081a");
  skyGrad.addColorStop(1, "#020514");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // stars
  stars.forEach((s) => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
  });

  // moon (behind obstacles)
  drawMoon();

  // mountains band
  const mountainBandY = HEIGHT * 0.7;
  const mountainH = HEIGHT * 0.22;
  if (mountainsReady) {
    ctx.drawImage(mountainsImg, 0, mountainBandY - mountainH, WIDTH, mountainH);
  }

  // subtle dark overlay behind mountains to blend sky
  const blendGrad = ctx.createLinearGradient(0, mountainBandY - mountainH, 0, mountainBandY);
  blendGrad.addColorStop(0, "rgba(0,0,0,0.15)");
  blendGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = blendGrad;
  ctx.fillRect(0, mountainBandY - mountainH, WIDTH, mountainH);

  // bottom steam band
  const steamBandH = HEIGHT * 0.24;
  if (steamReady) {
    ctx.drawImage(steamImg, 0, HEIGHT - steamBandH, WIDTH, steamBandH);
  } else {
    const fgGrad = ctx.createLinearGradient(0, HEIGHT * 0.75, 0, HEIGHT);
    fgGrad.addColorStop(0, "rgba(240,240,248,0.9)");
    fgGrad.addColorStop(1, "rgba(210,210,230,1)");
    ctx.fillStyle = fgGrad;
    ctx.fillRect(0, HEIGHT * 0.75, WIDTH, HEIGHT * 0.25);
  }

  // snowflakes (in front of sky/mountains, behind player)
  snowflakes.forEach((s) => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
  });
}

// ===== DRAW OBSTACLES & PLAYER =====
function drawObstacles() {
  obstacles.forEach((ob) => {
    const x = ob.x;
    const gapY = ob.gapY;
    const topHeight = gapY - GAP_HEIGHT / 2;
    const bottomY = gapY + GAP_HEIGHT / 2;
    const bottomHeight = HEIGHT - bottomY;

    ctx.fillStyle = woodPattern || "#6b4a2f";

    // top pillar
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, OBSTACLE_WIDTH, topHeight);
    ctx.clip();
    ctx.fillRect(x, 0, OBSTACLE_WIDTH, topHeight);
    ctx.restore();

    // bottom pillar
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, bottomY, OBSTACLE_WIDTH, bottomHeight);
    ctx.clip();
    ctx.fillRect(x, bottomY, OBSTACLE_WIDTH, bottomHeight);
    ctx.restore();
  });
}

function drawPlayer() {
  const drawX = player.x - player.w / 2;
  const drawY = player.y - player.h / 2;

  if (kokkyReady) {
    ctx.drawImage(kokkyImg, drawX, drawY, player.w, player.h);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // hop steam: flat puff under feet
  if (player.vy < 0) {
    const puffY = player.y + player.h * 0.35;
    ctx.fillStyle = "rgba(220,220,230,0.8)";
    ctx.beginPath();
    ctx.ellipse(player.x - 18, puffY, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===== UPDATE LOOP =====
function update(dt) {
  framesSinceStart++;

  // snow motion
  snowflakes.forEach((s) => {
    s.y += s.speed;
    if (s.y > HEIGHT) {
      s.y = -5;
      s.x = Math.random() * WIDTH;
    }
  });

  if (gameOver) return;

  // physics
  player.vy += GRAVITY;
  player.y += player.vy;

  if (player.y + player.h / 2 > HEIGHT) {
    player.y = HEIGHT - player.h / 2;
    endGame();
  } else if (player.y - player.h / 2 < 0) {
    player.y = player.h / 2;
    player.vy = 0;
  }

  // speed boost once at score >= 60
  if (!speedBoosted && score >= 60) {
    speed += 0.6;
    speedBoosted = true;
  }

  // move obstacles
  obstacles.forEach((ob) => {
    ob.x -= speed;
  });

  // recycle
  if (obstacles.length && obstacles[0].x + OBSTACLE_WIDTH < 0) {
    obstacles.shift();
    const lastX = obstacles[obstacles.length - 1].x;
    obstacles.push({
      x: lastX + OBSTACLE_SPACING,
      gapY: randomGapY(),
      counted: false,
    });
  }

  // scoring & collisions
  obstacles.forEach((ob) => {
    if (!ob.counted && player.x > ob.x + OBSTACLE_WIDTH) {
      ob.counted = true;
      score++;
      scoreSpan.textContent = "Score: " + score;
      maybeShowRankBanner(score);

      if (score > bestScoreForPlayer) {
        bestScoreForPlayer = score;
        bestSpan.textContent = "Best: " + bestScoreForPlayer;
      }
    }

    const withinX =
      player.x + player.w / 3 > ob.x &&
      player.x - player.w / 3 < ob.x + OBSTACLE_WIDTH;

    if (withinX) {
      const halfGap = GAP_HEIGHT / 2;
      const topLimit = ob.gapY - halfGap;
      const bottomLimit = ob.gapY + halfGap;

      const playerTop = player.y - player.h / 2 + 8;
      const playerBottom = player.y + player.h / 2 - 8;

      if (playerTop < topLimit || playerBottom > bottomLimit) {
        endGame();
      }
    }
  });

  if (rankBanner.visible) {
    rankBanner.timer--;
    if (rankBanner.timer <= 0) rankBanner.visible = false;
  }
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  saveScore(score);
}

// ===== UI DRAWING =====
function drawRankBanner() {
  if (!rankBanner.visible) return;

  const bannerWidth = WIDTH * 0.7;
  const bannerHeight = 50;
  const x = (WIDTH - bannerWidth) / 2;
  const y = HEIGHT * 0.1;

  const grad = ctx.createLinearGradient(x, y, x + bannerWidth, y + bannerHeight);
  grad.addColorStop(0, "#ffeb9a");
  grad.addColorStop(1, "#ffc857");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "#b38828";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, bannerWidth, bannerHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4b2b00";
  ctx.font = "28px Handjet";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(rankBanner.text, WIDTH / 2, y + bannerHeight / 2);
}

function drawGameOverMessage() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, HEIGHT * 0.35, WIDTH, HEIGHT * 0.3);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "36px Handjet";
  ctx.fillText("Game Over", WIDTH / 2, HEIGHT * 0.44);

  ctx.font = "26px Handjet";
  ctx.fillText("Tap or press Space to retry", WIDTH / 2, HEIGHT * 0.50);
}

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

// ===== MAIN LOOP =====
let lastTime = 0;
function loop(timestamp) {
  const dt = (timestamp - lastTime) / 16.67;
  lastTime = timestamp;

  update(dt);

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawObstacles();
  drawPlayer();
  drawRankBanner();
  if (gameOver) drawGameOverMessage();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
