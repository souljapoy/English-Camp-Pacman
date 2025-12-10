// Kokky's Hot Spring Hop – Full Advanced Version
// Fixed: hop sound every time + removed mid white band + safe UI checks

// ==========================
// Canvas + base setup
// ==========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width = 540;
const H = canvas.height = 960;

// ==========================
// UI Elements (safe check)
// ==========================
const scoreSpan = document.getElementById("score");
const bestSpan  = document.getElementById("best");
const rankSpan  = document.getElementById("rank");
const playerIdSpan = document.getElementById("playerIdDisplay");

// load saved values
let bestScore = +localStorage.getItem("onsen_bestScore") || 0;
if(bestSpan) bestSpan.textContent = bestScore;

// ==========================
// Player setup
// ==========================
const player = { x:110, y:H*0.5, vy:0, r:34 };
const gravity = 0.32;
const hopPower = -7.4;

// ==========================
// Ranks — YOUR ACTUAL SYSTEM
// (from your uploaded file)
// ==========================
const RANKS = [
  { threshold: 25,  title: "Steam Hopper" },
  { threshold: 50,  title: "Onsen Ace" },
  { threshold: 75,  title: "Steam Master" },
  { threshold: 100, title: "Onsen Overlord" },
  { threshold: 250, title: "King of the Onsen" },
  { threshold: 500, title: "Onsen Legend" },
  { threshold: 1000, title: "Onsen God" }
];

let currentRank = "";
function updateRank(){
  let next = "";
  for(const r of RANKS){
    if(score >= r.threshold) next = r.title;
  }
  currentRank = next;
  if(rankSpan) rankSpan.textContent = currentRank;
}

// ==========================
// Hop Sound — single MP3
// ==========================
const hopAudio = new Audio("hop1.mp3");
hopAudio.volume = 0.32;

function playHopSound(){
  try { hopAudio.currentTime = 0; } catch(e){}
  hopAudio.play().catch(()=>{});
}

// ==========================
// Graphics
// ==========================
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";

let kokkyReady = false;
kokkyImg.onload = () => kokkyReady = true;

// ==========================
// Effects
// ==========================
const snowflakes = [];
function initSnow(){
  snowflakes.length = 0;
  for(let i=0;i<70;i++){
    snowflakes.push({
      x:Math.random()*W,
      y:Math.random()*H,
      r:Math.random()*2+1,
      vy:Math.random()*0.8+0.4
    });
  }
}
initSnow();

const hopPuffs = [];

// ==========================
// Obstacles + carrots
// ==========================
const obstacles = [];
const carrots = [];

let score = 0;
if(scoreSpan) scoreSpan.textContent = score;

let running = false;
let frame = 0;
let scrollSpeed = 3.2;

// carrot wave spacing tuned
const CARROT_WAVE_SIZE = 5;
const CARROT_WAVE_GAP = 0.5;

function addObstacle(){
  const gap = 150;
  const center = Math.random()*(H-250)+125;
  const top = center-gap/2;
  const bottom = center+gap/2;
  const width = 66;

  let lastX = W+100;
  if(obstacles.length){
    lastX = obstacles.at(-1).x;
  }

  obstacles.push({
    x:lastX+180,
    width,
    top,
    bottom,
    passed:false
  });
}

function addCarrotWave(xstart){
  const y = player.y;
  for(let i=0;i<CARROT_WAVE_SIZE;i++){
    carrots.push({
      x:xstart+i*24,
      y:y-40,
      radius:7,
      collected:false,
      golden:i==Math.floor(CARROT_WAVE_SIZE/2)
    });
  }
}

// ==========================
// Input control
// ==========================
function hop(){
  if(!running) return;
  player.vy = hopPower;
  playHopSound();

  hopPuffs.push({
    x:player.x,
    y:player.y+player.r,
    radius:6,
    alpha:0.35
  });
}

canvas.addEventListener("pointerdown", ()=>{
  if(!running) startGame();
  else hop();
});

window.addEventListener("keydown", e=>{
  if(e.code==="Space"){
    if(!running) startGame();
    else hop();
    e.preventDefault();
  }
});

// ==========================
// Game flow
// ==========================
function reset(){
  score=0;
  if(scoreSpan) scoreSpan.textContent=score;
  player.y=H*0.5;
  player.vy=0;
  obstacles.length=0;
  carrots.length=0;
  hopPuffs.length=0;
  frame=0;
  scrollSpeed=3.2;
  updateRank();
}

function startGame(){
  reset();
  running=true;
}

// ==========================
// Collision + scoring
// ==========================
function checkObstacleCollision(){
  for(const o of obstacles){
    if(player.x+player.r > o.x && player.x-player.r < o.x+o.width){
      if(player.y-player.r < o.top || player.y+player.r > o.bottom){
        return true;
      }
    }
  }
  return false;
}

function collectCarrots(){
  carrots.forEach(c=>{
    if(c.collected) return;
    const dx=player.x-c.x, dy=player.y-c.y;
    if(Math.hypot(dx,dy) < player.r){
      c.collected=true;
      score += c.golden ? 5 : 2;
      if(scoreSpan) scoreSpan.textContent=score;
      updateRank();
    }
  });
}

// ==========================
// Render parts
// ==========================
function drawBackground(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#05091a");
  g.addColorStop(1,"#0b122b");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

  // mountains (bottom only)
  ctx.fillStyle="#0e142f";
  ctx.beginPath();
  ctx.moveTo(0,H*0.6);
  ctx.quadraticCurveTo(W*0.3,H*0.42,W*0.5,H*0.58);
  ctx.quadraticCurveTo(W*0.8,H*0.45,W,H*0.6);
  ctx.lineTo(W,H);
  ctx.lineTo(0,H);
  ctx.fill();
}

// snowfall behind obstacles
function drawSnow(){
  ctx.fillStyle="white";
  snowflakes.forEach(s=>{
    ctx.globalAlpha=0.7;
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha=1;
}

function drawObstacles(){
  ctx.fillStyle="#47693d";
  obstacles.forEach(o=>{
    ctx.fillRect(o.x,0,o.width,o.top);
    ctx.fillRect(o.x,o.bottom,o.width,H-o.bottom);
  });
}

function drawCarrots(){
  carrots.forEach(c=>{
    if(c.collected) return;
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.radius,0,Math.PI*2);
    ctx.fillStyle = c.golden ? "#ffd85a" : "#ff9f43";
    ctx.fill();
  });
}

function drawPlayer(){
  if(kokkyReady){
    ctx.drawImage(kokkyImg,player.x-32,player.y-30,64,54);
  }else{
    ctx.fillStyle="white";
    ctx.beginPath();
    ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
    ctx.fill();
  }
}

function drawHopPuffs(){
  ctx.globalAlpha=1;
  hopPuffs.forEach(p=>{
    ctx.globalAlpha=p.alpha;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
    ctx.fillStyle="#dee8ff";
    ctx.fill();
  });
  ctx.globalAlpha=1;
}

function drawOnsenSteam(){
  ctx.save();
  const g = ctx.createLinearGradient(0,H*0.9,0,H);
  g.addColorStop(0,"rgba(200,210,228,0)");
  g.addColorStop(1,"rgba(220,230,244,0.8)");
  ctx.fillStyle=g;
  ctx.fillRect(0,H*0.9,W,H*0.1);
  ctx.restore();
}

// ==========================
// Main Update Loop
// ==========================
function loop(){
  requestAnimationFrame(loop);
  frame++;

  // background + snow
  drawBackground();
  drawSnow();

  if(!running){
    drawObstacles();
    drawCarrots();
    drawPlayer();
    drawHopPuffs();
    drawOnsenSteam();
    return;
  }

  // physics
  player.vy+=gravity;
  player.y+=player.vy;

  if(player.y-player.r<0) player.y=player.r;
  if(player.y+player.r>H){ running=false; }

  snowflakes.forEach(s=>{
    s.y+=s.vy;
    if(s.y>H+10){
      s.y=-10;
      s.x=Math.random()*W;
    }
  });

  if(frame%80===0){
    addObstacle();
  }

  obstacles.forEach(o=>{
    o.x -= scrollSpeed;
    if(!o.passed && o.x+o.width < player.x){
      o.passed=true;
      score++;
      if(scoreSpan) scoreSpan.textContent = score;
      updateRank();

      addCarrotWave(o.x + o.width + (o.width*CARROT_WAVE_GAP));
      if(score===60){
        scrollSpeed=3.7;
      }
    }
  });

  collectCarrots();
  carrots.forEach(c => c.x -= scrollSpeed);

  hopPuffs.forEach(p=>{
    p.y-=0.3;
    p.alpha-=0.015;
  });

  // cleanup
  if(obstacles.length && obstacles[0].x+obstacles[0].width< -100) obstacles.shift();
  if(carrots.length && carrots[0].x < -50) carrots.shift();
  if(hopPuffs.length && hopPuffs[0].alpha<=0) hopPuffs.shift();

  if(checkObstacleCollision()){
    running=false;
  }

  // draw
  drawObstacles();
  drawCarrots();
  drawPlayer();
  drawHopPuffs();
  drawOnsenSteam();

  if(!running){
    if(score>bestScore){
      bestScore = score;
      if(bestSpan) bestSpan.textContent = bestScore;
      localStorage.setItem("onsen_bestScore",bestScore);
    }
  }
}

// start loop
loop();
