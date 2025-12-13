const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const kokkyImg = new Image();
kokkyImg.src = "kokky.png";

const woodImg = new Image();
woodImg.src = "wood.png";

/* ---------- GAME CONSTANTS ---------- */

const GRAVITY = 0.55;
const JUMP = -9;
const PIPE_GAP = 165;
const PIPE_WIDTH = 64;
const PIPE_SPACING = 220;
const PIPE_START_X = 360;

/* Kokky = ORIGINAL SCALE */
const kokky = {
  x: 120,
  y: canvas.height / 2,
  vy: 0,
  w: 32,
  h: 32
};

/* ---------- STATE ---------- */

let pipes = [];
let score = 0;
let best = Number(localStorage.getItem("bestScore")) || 0;
let started = false;
let playerSet = false;

/* ---------- BACKGROUND ---------- */

const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() < 0.7 ? 1 : 2,
  c: Math.random() < 0.7 ? "#ffe9a3" : "#ffffff"
}));

const snow = Array.from({ length: 60 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  vy: 0.5 + Math.random()
}));

function drawMoon() {
  const x = 380, y = 120, r = 42;
  ctx.save();
  ctx.shadowColor = "#f6e7b8";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#f2e3b0";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,.08)";
  [[-10,-6,6],[8,4,4],[-2,10,5]].forEach(c=>{
    ctx.beginPath();
    ctx.arc(x+c[0], y+c[1], c[2], 0, Math.PI*2);
    ctx.fill();
  });
  ctx.restore();
}

/* ---------- PIPES ---------- */

function spawnPipe() {
  const gapY = 120 + Math.random() * (canvas.height - 360);
  pipes.push({
    x: PIPE_START_X,
    gapY
  });
}

/* ---------- INPUT ---------- */

function jump() {
  if (!playerSet) {
    document.getElementById("playerOverlay").classList.remove("hidden");
    return;
  }
  started = true;
  kokky.vy = JUMP;
}

canvas.addEventListener("click", jump);
window.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});

/* ---------- LOOP ---------- */

function update() {
  kokky.vy += GRAVITY;
  kokky.y += kokky.vy;

  pipes.forEach(p => p.x -= 2);

  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - PIPE_SPACING) {
    spawnPipe();
  }

  pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);

  pipes.forEach(p => {
    if (!p.scored && p.x + PIPE_WIDTH < kokky.x) {
      score++;
      p.scored = true;
      best = Math.max(best, score);
      localStorage.setItem("bestScore", best);
    }

    if (
      kokky.x + kokky.w > p.x &&
      kokky.x < p.x + PIPE_WIDTH &&
      (kokky.y < p.gapY - PIPE_GAP / 2 ||
       kokky.y + kokky.h > p.gapY + PIPE_GAP / 2)
    ) reset();
  });

  if (kokky.y < 0 || kokky.y + kokky.h > canvas.height) reset();
}

function reset() {
  kokky.y = canvas.height / 2;
  kokky.vy = 0;
  pipes = [];
  score = 0;
  started = false;
}

/* ---------- DRAW ---------- */

function draw() {
  ctx.fillStyle = "#02040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  snow.forEach(f => {
    f.y += f.vy;
    if (f.y > canvas.height) f.y = 0;
    ctx.fillStyle = "#fff";
    ctx.fillRect(f.x, f.y, 1, 1);
  });

  drawMoon();

  pipes.forEach(p => {
    ctx.drawImage(
      woodImg,
      0, 0, woodImg.width, woodImg.height,
      p.x, 0,
      PIPE_WIDTH, p.gapY - PIPE_GAP / 2
    );
    ctx.drawImage(
      woodImg,
      0, 0, woodImg.width, woodImg.height,
      p.x, p.gapY + PIPE_GAP / 2,
      PIPE_WIDTH, canvas.height
    );
  });

  ctx.drawImage(kokkyImg, kokky.x, kokky.y);

  document.getElementById("score").textContent = `Score: ${score}`;
  document.getElementById("best").textContent = `Best: ${best}`;
}

/* ---------- MAIN ---------- */

function loop() {
  if (started) update();
  draw();
  requestAnimationFrame(loop);
}

loop();

/* ---------- PLAYER UI ---------- */

const overlay = document.getElementById("playerOverlay");
document.getElementById("changePlayerBtn").onclick = () => overlay.classList.remove("hidden");

document.querySelectorAll(".teamBtn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".teamBtn").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
    const list = document.getElementById("numberList");
    list.innerHTML = "";
    if (btn.dataset.team === "Guest") {
      const b = document.createElement("button");
      b.textContent = "0";
      b.onclick = ()=>selectPlayer("Guest-0");
      list.appendChild(b);
    } else {
      for (let i=1;i<=41;i++) {
        const b=document.createElement("button");
        b.textContent=i;
        b.onclick=()=>selectPlayer(`${btn.dataset.team}-${i}`);
        list.appendChild(b);
      }
    }
  };
});

function selectPlayer(id){
  playerSet=true;
  document.getElementById("playerIdLabel").textContent=`Player: ${id}`;
  overlay.classList.add("hidden");
}
