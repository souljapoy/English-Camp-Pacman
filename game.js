// Kokky's Onsen Dash – Local Leaderboard Version
// Placeholder Kokky + working score + popup + popup input fix

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");

const scoreEl=document.getElementById("score");
const bestEl=document.getElementById("best");
const playBtn=document.getElementById("startBtn");
const msgEl=document.getElementById("msg");

// Popup
const overlayEl=document.getElementById("overlay");
const popupEl=document.getElementById("namePopup");
const nameInput=document.getElementById("nameInput");
const nameError=document.getElementById("nameError");
const submitNameBtn=document.getElementById("submitNameBtn");
const cancelNameBtn=document.getElementById("cancelNameBtn");

// New: Track popup state to disable controls
let popupIsOpen = false;

// Game values
let W=canvas.width;
let H=canvas.height;
let running=false;
let obstacles=[];
let score=0;
let best=Number(localStorage.getItem("onsen_best")||0);
bestEl.textContent=best;

let player={x:120,y:H/2,vy:0,r:22};
const gravity=0.45;
const hopPower=-8.8;
const gapSize=180;
let spawnTimer=0;

// Controls
window.addEventListener("keydown",e=>{
  if(e.code==="Space"){
    if(!popupIsOpen) {
      hop();
    }
    e.preventDefault();
  }
});
canvas.addEventListener("pointerdown",()=>{
  if(!popupIsOpen) hop();
});

function hop(){
  if(popupIsOpen) return;
  if(!running){
    startGame();
  }
  player.vy=hopPower;
}

// Obstacles
function addObstacle(){
  const top=40+Math.random()*(H-260);
  obstacles.push({
    x:W+40, top:top, gap:gapSize, passed:false
  });
}

function collide(o){
  if(player.x+player.r>o.x && player.x-player.r<o.x+40){
    if(player.y-player.r<o.top || player.y+player.r>o.top+o.gap){
      return true;
    }
  }
  return false;
}

// Leaderboard local
function getDeviceId(){
  let id=localStorage.getItem("onsen_dev_id");
  if(!id){
    id="dev_"+Math.random().toString(36).slice(2,9);
    localStorage.setItem("onsen_dev_id",id);
  }
  return id;
}
function loadBoard(){
  try{
    let arr=JSON.parse(localStorage.getItem("onsen_lb")||"[]");
    return Array.isArray(arr)?arr:[];
  }catch(e){return [];}
}
function saveBoard(list){
  localStorage.setItem("onsen_lb",JSON.stringify(list));
}
function qualifies(newScore){
  const list=loadBoard();
  if(list.length<20) return true;
  const min=Math.min(...list.map(e=>e.score));
  return newScore>min;
}
function upsert(name,score){
  const id=getDeviceId();
  let list=loadBoard();
  let found=false;
  for(let e of list){
    if(e.id===id){
      if(score>e.score){
        e.score=score;
        e.name=name;
        e.ts=Date.now();
      }
      found=true;
      break;
    }
  }
  if(!found){
    list.push({id,name,score,ts:Date.now()});
  }
  list.sort((a,b)=>b.score-a.score);
  if(list.length>20) list=list.slice(0,20);
  saveBoard(list);
}

function showPopup(){
  popupIsOpen = true; // NEW FIX
  overlayEl.classList.remove("hidden");
  popupEl.classList.remove("hidden");
  nameInput.value="";
  nameError.textContent="";
  nameInput.focus();

  function close(){
    popupIsOpen = false; // NEW FIX
    overlayEl.classList.add("hidden");
    popupEl.classList.add("hidden");
    submitNameBtn.removeEventListener("click",submit);
    cancelNameBtn.removeEventListener("click",close);
  }
  function submit(){
    const raw=nameInput.value.trim();
    if(!raw){
      nameError.textContent="Required: W/R/G/B + Name";
      return;
    }
    const parts=raw.split(/\s+/);
    if(parts.length<2){
      nameError.textContent="Format: W Name";
      return;
    }
    const first=parts[0].toUpperCase();
    parts[0]=first;
    upsert(parts.join(" "),score);
    close();
  }
  submitNameBtn.addEventListener("click",submit);
  cancelNameBtn.addEventListener("click",close);
}

// Game loop
function startGame(){
  running=true;
  score=0;
  scoreEl.textContent=score;
  obstacles=[];
  player.y=H/2;
  player.vy=0;
  spawnTimer=0;
  msgEl.textContent="";
  loop();
}

function endGame(){
  running=false;
  if(score>best){
    best=score;
    localStorage.setItem("onsen_best",best);
    bestEl.textContent=best;
    msgEl.textContent="New Best! "+score;
  }else{
    msgEl.textContent="Game Over!";
  }

  if(qualifies(score)) showPopup();
}

function update(){
  player.vy+=gravity;
  player.y+=player.vy;

  if(player.y+player.r>H){
    endGame();
  }

  spawnTimer++;
  if(spawnTimer>85){
    spawnTimer=0;
    addObstacle();
  }

  obstacles.forEach(o=>{
    o.x-=3;
    if(!o.passed && o.x+40<player.x){
      o.passed=true;
      score++;
      scoreEl.textContent=score;
    }
    if(collide(o)) {endGame();}
  });
  obstacles=obstacles.filter(o=>o.x>-60);
}

function draw(){
  ctx.fillStyle="#0b0f25";
  ctx.fillRect(0,0,W,H);

  // obstacles
  ctx.fillStyle="rgba(240,240,255,0.75)";
  obstacles.forEach(o=>{
    ctx.fillRect(o.x,0,40,o.top);
    ctx.fillRect(o.x,o.top+o.gap,40,H-(o.top+o.gap));
  });

  // placeholder Kokky
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.ellipse(player.x,player.y,player.r,player.r*1.1,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#ff71b5"; // shirt
  ctx.beginPath();
  ctx.ellipse(player.x,player.y+8,player.r,player.r*0.9,0,0,Math.PI*2);
  ctx.fill();
}

function loop(){
  if(!running) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

// initial draw
draw();
