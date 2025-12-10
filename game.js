// Kokky's Hot Spring Hop – polished: bamboo obstacles, bottom steam only, improved carrots & spacing

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");
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
let obstacleSpawnCount = 0;
let score = 0;
let obstaclesPassed = 0;
let carrotWaveCount = 0;
let lastCarrotWaveObstacleCount = 0;
let carrotPatternIndex = 0;

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

// Hop steam particles (small & subtle)
let hopPuffs = [];

// Background elements
let stars = [];
let snowflakes = [];
let lanternPhase = 0;

// Kokky sprite
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";
let kokkyLoaded = false;
kokkyImg.onload = () => { kokkyLoaded = true; };

// Hop sound (soft steam puff)
const hopSoundFiles = ["hop1.mp3", "hop2.mp3", "hop3.mp3"];
const hopSounds = [];
hopSoundFiles.forEach(src => {
  const audio = new Audio(src);
  audio.volume = 0.28; // soft, calm
  hopSounds.push(audio);
});

function playHopSound(){
  if(!hopSounds.length) return;
  const idx = Math.floor(Math.random() * hopSounds.length);
  const base = hopSounds[idx];
  const s = base.cloneNode();
  s.volume = base.volume;
  s.playbackRate = 0.96 + Math.random()*0.08; // tiny pitch variation
  s.play().catch(()=>{});
}

// Init UI
updatePlayerLabel();
updateBestFromLeaderboard();
initStars();
initSnow();

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

function getRankIndexForObstacles(count){
  let idx = -1;
  for(let i=0; i<RANKS.length; i++){
    if(count >= RANKS[i].threshold) idx = i;
  }
  return idx;
}

// Background init
function initStars(){
  stars = [];
  for(let i=0;i<60;i++){
    stars.push({
      x: Math.random()*W,
      y: Math.random()*H*0.5,
      phase: Math.random()*Math.PI*2,
      warm: Math.random() < 0.3 // 30% yellowish
    });
  }
}

function initSnow(){
  snowflakes = [];
  const count = 70;
  for(let i=0;i<count;i++){
    snowflakes.push({
      x: Math.random()*W,
      y: Math.random()*H,
      r: 1.2 + Math.random()*1.4,
      vy: 0.4 + Math.random()*0.5,
      drift: (Math.random()*0.3) - 0.15,
      phase: Math.random()*Math.PI*2
    });
  }
}

// Game control
function startGame() {
  if(!currentPlayerId){
    openPlayerOverlay();
    return;
  }
  running = true;
  score = 0;
  obstacleSpawnCount = 0;
  obstaclesPassed = 0;
  carrotWaveCount = 0;
  lastCarrotWaveObstacleCount = 0;
  carrotPatternIndex = 0;
  nextRankIndex = 0;
  rankPopupTimer = 0;
  rankPopupTitle = "";
  scoreEl.textContent = score;
  msgEl.textContent = "";
  obstacles = [];
  carrots = [];
  hopPuffs = [];
  player.y = H/2;
  player.vy = 0;
  spawnTimer = 0;
}

function hop() {
  if(!running) return;
  player.vy = hopPower;
  playHopSound();

  // small, subtle hop steam
  hopPuffs.push({
    x: player.x,
    y: player.y + player.r,
    radius: 6,
    alpha: 0.35
  });
}

// Spawning
function addObstacle(){
  const minCenter = 120;
  const maxCenter = H - 120;
  const baseCenter = minCenter + Math.random()*(maxCenter - minCenter);
  const mix = 0.7 * baseCenter + 0.3 * player.y;
  const center = Math.max(minCenter, Math.min(maxCenter, mix));
  const top = center - gapSize/2;

  obstacleSpawnCount++;
  let style = "bamboo";
  if(obstacleSpawnCount > 60){
    style = "torii";
  }else if(obstacleSpawnCount > 40){
    style = "fenceLantern";
  }else if(obstacleSpawnCount > 20){
    style = "fence";
  }

  obstacles.push({
    x: W + 40,
    top,
    gap: gapSize,
    passed: false,
    style
  });
}

// Carrot wave: 10 carrots, random pattern order; normal = 1pt, golden = 5pts
function spawnCarrotWave() {
  carrotWaveCount++;
  const goldenIndex = Math.floor(Math.random()*10); // one golden per wave

  const pattern = carrotPatternIndex % 5;
  carrotPatternIndex++;

  const baseX = W + 60;
  const stepX = 24;
  const baseY = H/2;

  for(let i=0;i<10;i++){
    let offsetY = 0;
    if(pattern === 0){
      // U-shape
      const center = 4.5;
      const d = i - center;
      offsetY = d*d * 3;
    }else if(pattern === 1){
      // rising diagonal ↗
      offsetY = -30 + i*6;
    }else if(pattern === 2){
      // falling diagonal ↘
      offsetY = 30 - i*6;
    }else if(pattern === 3){
      // flat mid-line
      offsetY = -10;
    }else if(pattern === 4){
      // sine wave
      offsetY = Math.sin(i * 0.8) * 25;
    }

    carrots.push({
      x: baseX + i*stepX,
      y: baseY + offsetY,
      r: 14,
      golden: (i === goldenIndex),
      phase: Math.random()*Math.PI*2
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

  const runRankIndex = getRankIndexForObstacles(obstaclesPassed);

  let list = loadBoard();
  let entry = list.find(e=>e.id === currentPlayerId);
  const prevScore = entry ? entry.score : 0;
  const prevRankIndex = entry && typeof entry.bestRankIndex === "number" ? entry.bestRankIndex : -1;

  const isBetterScore = score > prevScore;
  const isBetterRank  = runRankIndex > prevRankIndex;

  if(!entry){
    entry = {
      id: currentPlayerId,
      score: score,
      ts: Date.now(),
      bestRankIndex: runRankIndex
    };
    list.push(entry);
  }else{
    if(isBetterScore){
      entry.score = score;
      entry.ts = Date.now();
    }
    if(isBetterRank){
      entry.bestRankIndex = runRankIndex;
      if(!isBetterScore){
        entry.ts = Date.now();
      }
    }
  }

  list.sort((a,b)=> b.score - a.score || a.ts - b.ts);
  if(list.length > 50) list = list.slice(0,50);
  saveBoard(list);

  if(isBetterScore){
    msgEl.textContent = `New Best! ${score}`;
  }else{
    msgEl.textContent = `Score: ${score} (Best: ${prevScore})`;
  }

  updateBestFromLeaderboard();
}

// Rank check
function checkRankUp() {
  if(nextRankIndex >= RANKS.length) return;
  const nextRank = RANKS[nextRankIndex];
  if(obstaclesPassed >= nextRank.threshold){
    rankPopupTitle = nextRank.title;
    rankPopupTimer = 150;
    nextRankIndex++;
  }
}

// Update loop
function updateGame(){
  if(!running) return;

  // physics
  player.vy += gravity;
  player.y += player.vy;

  if(player.y + player.r > H || player.y - player.r < 0){
    endGame();
    return;
  }

  const speed = obstaclesPassed >= 60 ? boostedSpeed : baseSpeed;

  // Spawn obstacles – allow spawn unless carrots still too far right
  let canSpawnObstacle = true;
  if(carrots.length > 0){
    let maxCarrotX = -Infinity;
    for(const c of carrots){
      if(c.x > maxCarrotX) maxCarrotX = c.x;
    }
    // allow next obstacle once carrots have moved closer to left (approx 0.5 gap)
    if(maxCarrotX > W*0.3){
      canSpawnObstacle = false;
    }
  }

  if(canSpawnObstacle){
    spawnTimer++;
    if(spawnTimer > 85){
      spawnTimer = 0;
      addObstacle();
    }
  }

  // Obstacles movement / scoring
  obstacles.forEach(o=>{
    o.x -= speed;
    if(!o.passed && o.x + 40 < player.x){
      o.passed = true;
      obstaclesPassed++;
      score++;
      scoreEl.textContent = score;

      checkRankUp();

      // car
