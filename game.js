// Kokky's Onsen Dash – Flappy-style with ranks, carrot waves, Kokky sprite, team IDs

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");
const startBtn = document.getElementById("startBtn");
const msgEl   = document.getElementById("msg");

const playerOverlay = document.getElementById("playerOverlay");
const playerIdLabel = document.getElementById("playerIdLabel");
const changePlayerBtn = document.getElementById("changePlayerBtn");

const teamButtonsContainer = document.getElementById("teamButtons");
const numberList = document.getElementById("numberList");
const selectedPreview = document.getElementById("selectedPreview");
const confirmPlayerBtn = document.getElementById("confirmPlayerBtn");
const cancelPlayerBtn = document.getElementById("cancelPlayerBtn");

const W = canvas.width;
const H = canvas.height;

// Team config
const TEAM_CONFIG = {
  W: { label: "White", numbers: [5,8,9,18,19,22,28,29,30,34], alts: ["A","B"] },
  R: { label: "Red",   numbers: [1,4,6,7,11,13,20,21,27,31,40], alts: ["A","B"] },
  B: { label: "Blue",  numbers: [2,3,15,16,17,25,32,33,38,41], alts: ["A","B"] },
  G: { label: "Green", numbers: [10,12,14,23,24,26,35,36,37,39], alts: ["A","B"] },
  Guest: { label: "Guest", numbers: [0], alts: [] }
};

// Rank thresholds (by obstacles passed)
const RANKS = [
  { threshold: 25,  title: "Steam Hopper" },
  { threshold: 50,  title: "Onsen Ace" },
  { threshold: 75,  title: "Steam Master" },
  { threshold: 100, title: "Onsen Overlord" },
  { threshold: 250, title: "King of the Onsen" },
  { threshold: 500, title: "Onsen Legend" },
  { threshold: 1000, title: "Onsen God" }
];

// Game state
let running = false;
let obstacles = [];
let carrots = [];
let score = 0;
let obstaclesPassed = 0;
let carrotWaveCount = 0;
let lastCarrotWaveObstacleCount = 0;

let currentPlayerId = localStorage.getItem("onsen_player_id") || null;

// Player physics
let player = { x: 120, y: H/2, vy: 0, r: 24 };
const gravity = 0.45;
const hopPower = -8.8;
const gapSize = 180;
let spawnTimer = 0;

const baseSpeed = 3;
const boostedSpeed = 3.8; // after 60 obstacles

// Rank popup
let nextRankIndex = 0;
let rankPopupTimer = 0;
let rankPopupTitle = "";

// Screen shake
let shakeTimer = 0;

// Kokky sprite
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";
let kokkyLoaded = false;
kokkyImg.onload = () => { kokkyLoaded = true; };

// Init UI
updatePlayerLabel();
updateBestFromLeaderboard();

// Controls
window.addEventListener("keydown", e=>{
  if(e.code === "Space"){
    if(!running){
      startGame();
    }else{
      hop();
    }
    e.preventDefault();
  }
});

canvas.addEventListener("pointerdown", () => {
  if(!running){
    startGame();
  }else{
    hop();
  }
});

startBtn.addEventListener("click", () => {
  startGame();
});

changePlayerBtn.addEventListener("click", () => {
  openPlayerOverlay();
});

cancelPlayerBtn.addEventListener("click", () => {
  closePlayerOverlay(false);
});

// Player overlay logic
let selectedTeamKey = null;
let selectedNumberCode = null;

function openPlayerOverlay() {
  selectedTeamKey = null;
  selectedNumberCode = null;
  confirmPlayerBtn.disabled = true;
  selectedPreview.textContent = "Player: -";
  numberList.innerHTML = '<p class="hint">Select a team first.</p>';
  Array.from(document.querySelectorAll(".teamBtn")).forEach(btn=>{
    btn.classList.remove("selected");
  });
  playerOverlay.classList.remove("hidden");
}

function closePlayerOverlay(committed) {
  playerOverlay.classList.add("hidden");
  if(!committed && !currentPlayerId){
    setTimeout(openPlayerOverlay, 10);
  }
}

teamButtonsContainer.addEventListener("click", e=>{
  const btn = e.target.closest(".teamBtn");
  if(!btn) return;
  const teamKey = btn.dataset.team;
  selectedTeamKey = teamKey;
  selectedNumberCode = null;
  confirmPlayerBtn.disabled = true;
  selectedPreview.textContent = "Player: -";

  Array.from(teamButtonsContainer.querySelectorAll(".teamBtn")).forEach(b=>{
    b.classList.toggle("selected", b === btn);
  });

  buildNumberList(teamKey);
});

function buildNumberList(teamKey) {
  const cfg = TEAM_CONFIG[teamKey];
  numberList.innerHTML = "";
  if(!cfg){
    numberList.innerHTML = '<p class="hint">Unknown team.</p>';
    return;
  }

  if(teamKey === "Guest") {
    const btn = document.createElement("button");
    btn.textContent = "0 – Guest";
    btn.dataset.code = "0";
    btn.addEventListener("click", ()=>selectNumberCode("0", btn));
    numberList.appendChild(btn);
    return;
  }

  const allCodes = [...cfg.numbers.map(n=>String(n)), ...cfg.alts];

  allCodes.forEach(code => {
    const btn = document.createElement("button");
    if(code === "A" || code === "B"){
      btn.textContent = `${code} (ALT)`;
    }else{
      btn.textContent = code;
    }
    btn.dataset.code = code;
    btn.addEventListener("click", ()=>selectNumberCode(code, btn));
    numberList.appendChild(btn);
  });
}

function selectNumberCode(code, btn) {
  selectedNumberCode = code;
  Array.from(numberList.querySelectorAll("button")).forEach(b=>{
    b.classList.remove("selected");
  });
  btn.classList.add("selected");
  updatePreviewAndButton();
}

function updatePreviewAndButton() {
  if(!selectedTeamKey || !selectedNumberCode){
    confirmPlayerBtn.disabled = true;
    selectedPreview.textContent = "Player: -";
    return;
  }

  let idStr;
  if(selectedTeamKey === "Guest"){
    idStr = "0";
  }else{
    idStr = `${selectedTeamKey}-${selectedNumberCode}`;
  }
  selectedPreview.textContent = `Player: ${idStr}`;
  confirmPlayerBtn.disabled = false;
}

confirmPlayerBtn.addEventListener("click", () => {
  if(!selectedTeamKey || !selectedNumberCode){
    return;
  }
  let idStr;
  if(selectedTeamKey === "Guest"){
    idStr = "0";
  }else{
    idStr = `${selectedTeamKey}-${selectedNumberCode}`;
  }
  currentPlayerId = idStr;
  localStorage.setItem("onsen_player_id", currentPlayerId);
  updatePlayerLabel();
  updateBestFromLeaderboard();
  closePlayerOverlay(true);
});

// Helpers
function updatePlayerLabel() {
  if(!currentPlayerId){
    playerIdLabel.textContent = "Not set";
  }else{
    playerIdLabel.textContent = currentPlayerId;
  }
}

function loadBoard(){
  try{
    const raw = localStorage.getItem("onsen_lb");
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function saveBoard(list){
  localStorage.setItem("onsen_lb", JSON.stringify(list));
}

function updateBestFromLeaderboard(){
  if(!currentPlayerId){
    bestEl.textContent = "0";
    return;
  }
  const list = loadBoard();
  const entry = list.find(e=>e.id === currentPlayerId);
  const best = entry ? entry.score : 0;
  bestEl.textContent = best;
}

// Game control
function startGame() {
  if(!currentPlayerId){
    openPlayerOverlay();
    return;
  }
  running = true;
  score = 0;
  obstaclesPassed = 0;
  carrotWaveCount = 0;
  lastCarrotWaveObstacleCount = 0;
  nextRankIndex = 0;
  rankPopupTimer = 0;
  rankPopupTitle = "";
  scoreEl.textContent = score;
  msgEl.textContent = "";
  obstacles = [];
  carrots = [];
  player.y = H/2;
  player.vy = 0;
  spawnTimer = 0;
}

function hop() {
  if(!running) return;
  player.vy = hopPower;
}

// Spawning
function addObstacle(){
  const minCenter = 120;
  const maxCenter = H - 120;
  const baseCenter = minCenter + Math.random()*(maxCenter - minCenter);
  const mix = 0.7 * baseCenter + 0.3 * player.y;
  const center = Math.max(minCenter, Math.min(maxCenter, mix));

  const top = center - gapSize/2;

  obstacles.push({
    x: W + 40,
    top,
    gap: gapSize,
    passed: false
  });
}

function spawnCarrotWave() {
  carrotWaveCount++;
  const hasGolden = (carrotWaveCount % 3 === 0);
  const goldenIndex = hasGolden ? Math.floor(Math.random()*5) : -1;
  const baseY = H/2;

  for(let i=0;i<5;i++){
    const offsetY = Math.sin(i * 0.7) * 40;
    carrots.push({
      x: W + 40 + i*30,
      y: baseY + offsetY,
      r: 10,
      golden: (i === goldenIndex)
    });
  }
}

// Collision
function collideObstacle(o){
  if(player.x + player.r > o.x && player.x - player.r < o.x + 40){
    if(player.y - player.r < o.top || player.y + player.r > o.top + o.gap){
      return true;
    }
  }
  return false;
}

function collideCarrot(c){
  const dx = player.x - c.x;
  const dy = player.y - c.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  return dist < (player.r + c.r);
}

// Game over
function endGame(){
  running = false;
  shakeTimer = 12;

  if(!currentPlayerId || score <= 0){
    msgEl.textContent = `Score: ${score}`;
    return;
  }

  let list = loadBoard();
  let entry = list.find(e=>e.id === currentPlayerId);
  const prev = entry ? entry.score : 0;

  if(score > prev){
    if(!entry){
      entry = {id: currentPlayerId, score, ts: Date.now()};
      list.push(entry);
    }else{
      entry.score = score;
      entry.ts = Date.now();
    }
    list.sort((a,b)=>b.score - a.score || a.ts - b.ts);
    if(list.length > 50) list = list.slice(0,50);
    saveBoard(list);
    msgEl.textContent = `New Best! ${score}`;
  }else{
    msgEl.textContent = `Score: ${score} (Best: ${prev})`;
  }

  updateBestFromLeaderboard();
}

// Rank check
function checkRankUp() {
  if(nextRankIndex >= RANKS.length) return;
  const nextRank = RANKS[nextRankIndex];
  if(obstaclesPassed >= nextRank.threshold){
    rankPopupTitle = nextRank.title;
    rankPopupTimer = 90; // frames
    nextRankIndex++;
  }
}

// Update loop
function updateGame(){
  if(!running) return;

  // physics
  player.vy += gravity;
  player.y += player.vy;

  // floor/ceiling
  if(player.y + player.r > H || player.y - player.r < 0){
    endGame();
    return;
  }

  // only spawn obstacles if no carrot wave on screen
  if(carrots.length === 0){
    spawnTimer++;
    if(spawnTimer > 85){
      spawnTimer = 0;
      addObstacle();
    }
  }

  const speed = obstaclesPassed >= 60 ? boostedSpeed : baseSpeed;

  // obstacles
  obstacles.forEach(o=>{
    o.x -= speed;
    if(!o.passed && o.x + 40 < player.x){
      o.passed = true;
      obstaclesPassed++;
      score++;
      scoreEl.textContent = score;

      checkRankUp();

      // carrot wave every 10 obstacles
      if(obstaclesPassed % 10 === 0 && obstaclesPassed !== lastCarrotWaveObstacleCount){
        lastCarrotWaveObstacleCount = obstaclesPassed;
        spawnCarrotWave();
      }
    }
  });

  obstacles = obstacles.filter(o=>o.x > -60);

  for(const o of obstacles){
    if(collideObstacle(o)){
      endGame();
      return;
    }
  }

  // carrots
  carrots.forEach(c=>{
    c.x -= speed;
  });
  carrots = carrots.filter(c=>{
    if(collideCarrot(c)){
      score += c.golden ? 5 : 2;
      scoreEl.textContent = score;
      return false;
    }
    return c.x > -30;
  });
}

// Draw
function draw(){
  ctx.save();

  if(shakeTimer > 0){
    const dx = (Math.random()*4 - 2);
    const dy = (Math.random()*4 - 2);
    ctx.translate(dx, dy);
    shakeTimer--;
  }

  // background
  ctx.fillStyle = "#050716";
  ctx.fillRect(0,0,W,H);

  // simple sky gradient
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, "#060b2a");
  grad.addColorStop(1, "#0b1028");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // moon
  ctx.fillStyle = "#f5f7ff";
  ctx.beginPath();
  ctx.arc(W-70,80,26,0,Math.PI*2);
  ctx.fill();

  // obstacles
  obstacles.forEach(o=>{
    ctx.fillStyle = "rgba(240,240,255,0.8)";
    ctx.fillRect(o.x,0,40,o.top);
    ctx.fillRect(o.x,o.top+o.gap,40,H-(o.top+o.gap));
  });

  // carrots
  carrots.forEach(c=>{
    ctx.fillStyle = c.golden ? "#ffd94a" : "#ff9d3b";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
    ctx.fill();
  });

  // player
  if(kokkyLoaded){
    const size = 64;
    ctx.drawImage(kokkyImg, player.x - size/2, player.y - size/2, size, size);
  }else{
    ctx.fillStyle="#fff";
    ctx.beginPath();
    ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
    ctx.fill();
  }

  // rank popup
  if(rankPopupTimer > 0){
    const alpha = rankPopupTimer > 20 ? 1 : rankPopupTimer/20;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000000aa";
    const boxW = 260;
    const boxH = 60;
    const bx = (W - boxW)/2;
    const by = 90;
    ctx.fillRect(bx,by,boxW,boxH);

    ctx.fillStyle = "#ffe79c";
    ctx.font = "12px 'Handjet'";
    ctx.textAlign = "center";
    ctx.fillText("Rank Up!", W/2, by+24);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(rankPopupTitle, W/2, by+44);

    ctx.globalAlpha = 1;
    rankPopupTimer--;
  }

  ctx.restore();
}

// Main loop
function loop(){
  updateGame();
  draw();
  requestAnimationFrame(loop);
}

loop();

// If no player selected yet, force overlay once
if(!currentPlayerId){
  openPlayerOverlay();
}
