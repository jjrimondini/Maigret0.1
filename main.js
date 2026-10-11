import { moveCriminals } from "./move-criminals.js";
import { wall } from "./criminal-utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");

const TILE = 40;
const COLS = 19;
const ROWS = 13;

const map = [
  "###################",
  "#C..#....#....#..C#",
  "#...#....#....#...#",
  "###...##...##...###",
  "#.....#...#.......#",
  "#.###.#.#.#.#####.#",
  "#...#...#...#.....#",
  "#.#.#####.###.###.#",
  "#.#.....#...#.....#",
  "#.#####...#...###.#",
  "#.....#...#...#...#",
  "#C..#....#....#..C#",
  "###################"
];

const cellPositions = [
  { x: 1, y: 1 }, { x: 17, y: 1 },
  { x: 1, y: 11 }, { x: 17, y: 11 }
];

const game = {
  COLS, ROWS, map, TILE, canvas, ctx, statusText,
  player: null, criminals: [], score: 0, caught: 0, gameOver: false,
  checkCapture
};

let lastPlayerMove = 0;
let lastEnemyMove = 0;
const keys = {};

function restart() {
  game.player = { x: 9, y: 6 };
  game.criminals = cellPositions.map((cell, i) => ({
    x: cell.x, y: cell.y, home: { ...cell }, target: null,
    color: ["#f87171", "#fb923c", "#e879f9", "#facc15"][i],
    personality: ["fifone", "furbo", "imprevedibile", "temerario"][i],
    arrested: false
  }));
  game.score = 0;
  game.caught = 0;
  game.gameOver = false;
  statusText.textContent = "Criminali in libertà: 4";
  draw();
}

function movePlayer(dx, dy) {
  if (game.gameOver) return;
  const nx = game.player.x + dx;
  const ny = game.player.y + dy;
  if (!wall(game, nx, ny)) {
    game.player.x = nx;
    game.player.y = ny;
    checkCapture();
  }
}

function checkCapture() {
  for (const c of game.criminals) {
    if (!c.arrested && c.x === game.player.x && c.y === game.player.y) {
      c.arrested = true;
      game.caught++;
      game.score += 100;
      statusText.textContent = `Arresti: ${game.caught}/4 | Punteggio: ${game.score}`;
      c.x = c.home.x;
      c.y = c.home.y;

      if (game.caught === game.criminals.length) {
        game.gameOver = true;
        statusText.textContent = `Caso risolto! 🎉 Punteggio finale: ${game.score}`;
      }
    }
  }
}

document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
    e.preventDefault();
  }
  keys[k] = true;
  if (k === "r") restart();
});
document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
document.getElementById("restart").addEventListener("click", restart);

function drawCharacter(x, y, emoji, color) {
  const cx = x * TILE + TILE / 2;
  const cy = y * TILE + TILE / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "23px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, cx, cy);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE, py = y * TILE;
      if (map[y][x] === "#") {
        ctx.fillStyle = "#263b5b";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = "#344d70";
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
      } else {
        ctx.fillStyle = "#111d30";
        ctx.fillRect(px, py, TILE, TILE);
        if (map[y][x] === "C") {
          ctx.fillStyle = "#a7f3d0";
          ctx.fillRect(px + 8, py + 8, 24, 24);
          ctx.fillStyle = "#065f46";
          ctx.font = "20px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("▤", px + 20, py + 20);
        }
      }
    }
  }

  for (const c of game.criminals) {
    if (!c.arrested) drawCharacter(c.x, c.y, "🏃", c.color);
  }
  drawCharacter(game.player.x, game.player.y, "🕵️", "#60a5fa");

  if (game.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(100, 190, 560, 130);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CASO RISOLTO!", 380, 240);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Maigret ha catturato tutti i criminali!", 380, 280);
  }
}

function loop(time) {
  if (!game.gameOver && time - lastPlayerMove > 125) {
    let dx = 0, dy = 0;
    if (keys.arrowup || keys.w) dy = -1;
    else if (keys.arrowdown || keys.s) dy = 1;
    else if (keys.arrowleft || keys.a) dx = -1;
    else if (keys.arrowright || keys.d) dx = 1;

    if (dx || dy) {
      movePlayer(dx, dy);
      lastPlayerMove = time;
    }
  }

  if (!game.gameOver && time - lastEnemyMove > 300) {
    moveCriminals(game);
    lastEnemyMove = time;
  }

  draw();
  requestAnimationFrame(loop);
}

restart();
requestAnimationFrame(loop);
