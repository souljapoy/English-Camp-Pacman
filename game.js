// Kokky's Onsen Dash – Team + Number Version
// No typing. Local-only leaderboard. Player saved between sessions.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const startBtn = document.getElementById("startBtn");
const msgEl = document.getElementById("msg");

const playerOverlay = document.getElementById("playerOverlay");
const playerIdLabel = document.getElementById("playerIdLabel");
const changePlayerBtn = document.getElementById("changePlayerBtn");

const numberList = document.getElementById("numberList");
const selectedPreview = document.getElementById("selectedPreview");
const confirmPlayerBtn = document.getElementById("confirmPlayerBtn");
const cancelPlayerBtn = document.getElementById("cancelPlayerBtn");

const teamButtonsContainer = document.getElementById("teamButtons");

const W = canvas.width;
const H = canvas.height;

// Final Team List Provided by You ✔
const TEAM_CONFIG = {
  W: { label: "White", numbers: [5,8,9,18,19,22,28,29,30,34], alts: ["A","B"] },
  R: { label: "Red", numbers: [1,4,6,7,11,13,20,21,27,31,40], alts: ["A","B"] },
  B: { label: "Blue", numbers: [2,3,15,16,17,25,32,33,38,41], alts: ["A","B"] },
  G: { label: "Green", numbers: [10,12,14,23,24,26,35,36,37,39], alts: ["A","B"] },
  Guest: { label: "Guest", numbers: [0], alts: [] }
};

let running = false;
let obstacles = [];
let score = 0;

let currentPlayerId = localStorage.getItem("onsen_player_id") || null;

updatePlayerLabel();
updateBestFromLeaderboard();

let player = { x: 120, y: H/2, vy: 0, r: 22 };
const gravity = 0.45;
const hopPower = -8.8;
const gapSize = 180;
let spawnTimer = 0;

// Controls
window.addEventListener("keydown", (e)=>{
  if(e.code === "Space"){
    if(!running){ startGame(); }
    else { hop(); }
    e.preventDefault();
  }
});
canvas.addEventListener("pointerdown", ()=>{
  if(!running){ startGame(); }
  else { hop(); }
});
startBtn.addEventListener("click", ()=>{ startGame(); });
changePlayerBtn.addEventListener("click", ()=>{ openPlayerOverlay(); });
cancelPlayerBtn.addEventListener("click", ()=>{ closePlayerOverlay(false); });

let selectedTeamKey = null;
let selectedNumberCode = null;

// Overlay Logic
function openPlayerOverlay(){
  selectedTeamKey = null;
  selectedNumberCode = null;
  confirmPlayerBtn.disabled = true;
  selectedPreview.textContent = "Player: -";
  numberList.innerHTML = '<p class="hint">Select a team first.</p>';
  document.querySelectorAll(".teamBtn").forEach(btn => btn.classList.remove("selected"));
  playerOverlay.classList.remove("hidden");
}
function closePlayerOverlay(committed){
  playerOverlay.classList.add("hidden");
  if(!committed && !currentPlayerId){
    setTimeout(openPlayerOverlay,10);
  }
}

teamButtonsContainer.addEventListener("click", e=>{
  const btn = e.target.closest(".teamBtn");
  if(!btn) return;
  selectedTeamKey = btn.dataset.team;
  selectedNumberCode = null;
  confirmPlayerBtn.disabled = true;
  selectedPreview.textContent = "Player: -";

  document.querySelectorAll(".teamBtn").forEach(b=>b.classList.toggle("selected", b===btn));
  buildNumberList(selectedTeamKey);
});

// Build number list after team selected
function buildNumberList(teamKey){
  const cfg = TEAM_CONFIG[teamKey];
  numberList.innerHTML = "";
  if(!cfg){
    numberList.innerHTML = '<p class="hint">Unknown team.</p>';
    return;
  }

  const codes = teamKey==="Guest"
    ? ["0"]
    : [...cfg.numbers.map(n=>String(n)), ...cfg.alts];

  codes.forEach(code=>{
    const btn=document.createElement("button");
    btn.textContent = (code==="A"||code==="B") ? `${code} (ALT)` : code;
    btn.addEventListener("click", ()=>selectNumber(code,btn));
    numberList.appendChild(btn);
  });
}

function selectNumber(code,btn){
  selectedNumberCode = code;
  document.querySelectorAll("#numberList button").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");
  updatePreview();
}

function updatePreview(){
  if(!selectedTeamKey || !selectedNumberCode){
    confirmPlayerBtn.disabled = true;
    selectedPreview.textContent = "Player: -";
    return;
  }
  let id = selectedTeamKey==="Guest" ? "0" : `${selectedTeamKey}-${selectedNumberCode}`;
  selectedPreview.textContent = `Player: ${id}`;
  confirmPlayerBtn.disabled = false;
}

confirmPlayerBtn.addEventListener("click", ()=>{
  if(!selectedTeamKey || !selectedNumberCode) return;
  currentPlayerId = selectedTeamKey==="Guest"
    ? "0"
    : `${selectedTeamKey}-${selectedNumberCode}`;
  localStorage.setItem("onsen_player_id", currentPlayerId);
  updatePlayerLabel();
  updateBestFromLeaderboard();
  closePlayerOverlay(true);
});

function updatePlayerLabel(){
  playerIdLabel.textContent = currentPlayerId || "Not set";
}

// Leaderboard local
function loadBoard(){
  try{
    return JSON.parse(localStorage.getItem("onsen_lb") || "[]");
  }catch{
    return [];
  }
}
function saveBoard(list){
  localStorage.setItem("onsen_lb", JSON.stringify(list));
}
function updateBestFromLeaderboard(){
  if(!currentPlayerId){ bestEl.textContent = "0"; return; }
  const entry = loadBoard().find(e=>e.id===currentPlayerId);
  bestEl.textContent = entry ? entry.score : 0;
}

// Game Loop
function startGame(){
  if(!currentPlayerId){ openPlayerOverlay(); return; }
  running = true;
  score = 0;
  scoreEl.textContent = score;
  msgEl.textContent = "";
  obstacles = [];
  player.y = H/2;
  player.vy = 0;
  spawnTimer = 0;
  loop();
}
function hop(){ if(running) player.vy = hopPower; }

function addObstacle(){
  const top = 40 + Math.random()*(H-260);
  obstacles.push({x:W+40,top,gap:gapSize,passed:false});
}
function collide(o){
  return (
    player.x+player.r>o.x && player.x-player.r<o.x+40 &&
    (player.y-player.r<o.top || player.y+player.r>o.top+o.gap)
  );
}

function endGame(){
  running = false;
  const list = loadBoard();
  let entry=list.find(e=>e.id===currentPlayerId);
  const prev=entry?entry.score:0;

  if(score>prev){
    if(!entry){
      list.push({id:currentPlayerId,score,ts:Date.now()});
    }else{
      entry.score=score;
      entry.ts=Date.now();
    }
    list.sort((a,b)=>b.score-a.score||a.ts-b.ts);
    if(list.length>50) list.length=50;
    saveBoard(list);
    msgEl.textContent=`New Best! ${score}`;
  }else msgEl.textContent=`Score: ${score}`;

  updateBestFromLeaderboard();
}

function update(){
  player.vy+=gravity;
  player.y+=player.vy;
  if(player.y+player.r>H){ endGame(); return; }

  spawnTimer++;
  if(spawnTimer>85){ spawnTimer=0; addObstacle(); }

  obstacles.forEach(o=>{
    o.x-=3;
    if(!o.passed && o.x+40<player.x){
      o.passed=true; score++;
      scoreEl.textContent=score;
    }
  });
  obstacles=obstacles.filter(o=>o.x>-60);
  if(obstacles.some(collide)){ endGame(); return; }
}

function draw(){
  ctx.fillStyle="#0b0f25";
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(240,240,255,.75)";
  obstacles.forEach(o=>{
    ctx.fillRect(o.x,0,40,o.top);
    ctx.fillRect(o.x,o.top+o.gap,40,H-(o.top+o.gap));
  });
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.ellipse(player.x,player.y,player.r,player.r*1.1,0,0,Math.PI*2);
  ctx.fill();
}

function loop(){
  if(!running) return;
  update(); draw();
  requestAnimationFrame(loop);
}

draw();
if(!currentPlayerId) openPlayerOverlay();

// END — checksum e9
