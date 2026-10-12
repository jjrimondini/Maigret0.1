/*
 * main.js — Cuore del gioco "Maigret: Caccia alla Fuga".
 * Gestisce la mappa, il giocatore (Maigret), la cattura dei criminali,
 * l'input da tastiera, il disegno sul canvas e il ciclo di gioco.
 * Il movimento dei criminali è delegato a move-criminals.js.
 */

/*
 * Import dai moduli esterni:
 * - moveCriminals: la funzione che decide come si muovono i criminali a ogni turno
 * - wall: funzione di utilità che dice se una casella (x, y) è un muro
 */
import { moveCriminals } from "./move-criminals.js";
import { wall } from "./criminal-utils.js";
import { levels } from "./levels.js";

/*
 * Riferimenti agli elementi della pagina (definiti in index.html):
 * - canvas: l'area di gioco
 * - ctx: il "pennello" 2D con cui si disegna sul canvas
 * - statusText: il paragrafo sotto al gioco con arresti e punteggio
 */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const TILE = 40;
const STARTING_LIVES = 3;
const POINTS_PER_LIFE = 1000;


/*
*importazioni variabili di livello da level.js
*/

let currentLevelIndex = 0;
let map = [];
let cellPositions = [];
let playerDelay = 0;
let criminalDelay = 0;
let scoreAtLevelStart = 0;
let levelComplete = false;
let levelLost = false;
let gameLost = false;

/*
 * Colore di ogni personalità, così in gioco si riconosce chi è chi.
 */
const PERSONALITY_COLORS = {
  fifone: "#facc15",        // giallo: pauroso
  furbo: "#fb923c",         // arancione
  imprevedibile: "#e879f9", // viola
  temerario: "#f87171"      // rosso: coraggioso
};

/*
 * Coordinate (in caselle)  dai tioli della mappa
 */
function findTiles(currentMap, char) {
  const cells = [];

  for (let y = 0; y < currentMap.length; y++) {
    for (let x = 0; x < currentMap[y].length; x++) {
      if (currentMap[y][x] === char) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

/*
 * findPlayerStart(currentMap): restituisce la posizione della "P",
 * cioè la casella di partenza di Maigret.
 */
function findPlayerStart(currentMap) {
  for (let y = 0; y < currentMap.length; y++) {
    const x = currentMap[y].indexOf("P");
    if (x !== -1) return { x, y };
  }
  return null;
}



/*
 * Lo "stato del gioco": un unico oggetto che raccoglie tutto ciò che serve
 * anche agli altri moduli (che lo ricevono come parametro).
 * Contiene costanti e riferimenti (mappa, dimensioni, canvas), il giocatore,
 * la lista dei criminali, punteggio, numero di arresti, il flag di fine partita
 * e la funzione checkCapture (così anche move-criminals.js può verificare
 * una cattura quando è un criminale a finire addosso a Maigret).
 */
const game = {
  COLS: 0, ROWS: 0, map, TILE, canvas, ctx, statusText,
  player: null, criminals: [], exits: [], score: 0, lives: STARTING_LIVES, livesEarned: 0, caught: 0, gameOver: false,
  checkCapture, checkEscape
};

/*
 * Variabili di temporizzazione e input:
 * - lastPlayerMove / lastEnemyMove: istante (in ms) dell'ultimo passo del giocatore
 *   e dei criminali, usati per regolarne la velocità
 * - keys: mappa dei tasti attualmente premuti (es. keys.w === true mentre W è giù)
 */
let lastPlayerMove = 0;
let lastEnemyMove = 0;
const keys = {};

/*
 * Variabili della grafica (non toccano la logica di gioco):
 * - now / lastFrame: tempo attuale e del fotogramma precedente, per le animazioni
 * - visuals: per ogni personaggio, la posizione "disegnata" (che scorre fluida
 *   verso la casella vera), la direzione in cui guarda e il tempo di camminata
 * - effects: scintille e scritte "+100" che compaiono alle catture
 * - background: immagine della mappa disegnata una sola volta per livello
 */
let now = 0;
let lastFrame = 0;
const visuals = new WeakMap();
const effects = [];
let background = null;

/*
 * funzione loadlevel per caricare i livelli da levels.js
 * Imposta la mappa, le celle, i ritardi di movimento, il giocatore e i criminali.
 * Aggiorna anche il testo del livello e lo stato iniziale della partita.
 */

function loadLevel(index) {
  if (index < 0 || index >= levels.length) return;

  currentLevelIndex = index;
  scoreAtLevelStart = game.score;

  const level = levels[index];

  map = level.map;
  cellPositions = findTiles(map, "C");
  game.exits = findTiles(map, "E")

  // Aggiorna anche la mappa usata dai moduli dei bot.
  game.map = map;
  game.ROWS = map.length;
  game.COLS = map[0].length;
  // Tutte le righe devono avere la stessa lunghezza, altrimenti la mappa è "storta".
  if (map.some(row => row.length !== game.COLS)) {
    throw new Error(`Nel livello ${level.name} le righe della mappa non sono tutte lunghe uguali`);
  }

  // Il canvas si adatta alla mappa del livello.
  canvas.width = game.COLS * TILE;
  canvas.height = game.ROWS * TILE;
  playerDelay = level.playerDelay;
  criminalDelay = level.criminalDelay;

  const start = findPlayerStart(map);
  if (!start) {
    throw new Error(`Nel livello ${level.name} manca la "P" di Maigret`);
  }
  game.player = start;

  game.criminals = level.bots.map((bot) => {
    const cell = cellPositions[bot.cell];

    if (!cell) {
      throw new Error(
        `Cella ${bot.cell} non valida nel livello ${level.name}`
      );
    }

    return {
      x: cell.x,
      y: cell.y,
      home: { ...cell },
      target: null,
      color: PERSONALITY_COLORS[bot.type] ?? "#9ca3af",
      personality: bot.type,
      arrested: bot.arrested === true
    };
  });

  game.caught = game.criminals.filter(c => c.arrested).length;
  if (game.caught === game.criminals.length) {
    throw new Error(`Nel livello ${level.name} tutti i criminali sono già arrestati`);
  }
  game.gameOver = false;
  levelComplete = false;
  levelLost = false;
  gameLost = false;

  document.getElementById("level-info").textContent = level.name;

  statusText.textContent =
    `Criminali in libertà: ${game.criminals.length - game.caught} | Punteggio: ${game.score}`;

  lastPlayerMove = 0;
  lastEnemyMove = 0;

  effects.length = 0;
  buildBackground();
  draw();
}

/*
  * restart(): riavvia la partita, azzerando il punteggio e caricando il primo livello.
  */

function restart() {
  game.score = 0;
  game.lives = STARTING_LIVES;
  game.livesEarned = 0;
  updateLives();
  loadLevel(0);
}

/*
 * movePlayer(dx, dy): sposta Maigret di una casella nella direzione indicata
 * (dx, dy valgono -1, 0 o 1). Se la partita è finita non fa nulla.
 * Calcola la nuova posizione e, solo se non è un muro, ci sposta il giocatore
 * e controlla se ha raggiunto un criminale.
 */
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

/*
 * checkCapture(): controlla se Maigret si trova sulla stessa casella di un
 * criminale ancora libero. In quel caso il criminale viene arrestato:
 * +1 arresto, +100 punti, testo di stato aggiornato e il criminale viene
 * rimandato nella sua cella (da quel momento non viene più disegnato).
 * Se tutti i criminali sono stati arrestati, la partita finisce con la vittoria.
 */
function checkCapture() {
  for (const c of game.criminals) {
    if (
      !c.arrested &&
      c.x === game.player.x &&
      c.y === game.player.y
    ) {
      c.arrested = true;
      game.caught++;
      game.score += 100;
      checkBonusLife();
      spawnCaptureEffect(c);
      c.x = c.home.x;
      c.y = c.home.y;
    }
  }

  statusText.textContent =
    `Arresti: ${game.caught}/${game.criminals.length}` +
    ` | Punteggio: ${game.score}`;

  if (
    game.criminals.length > 0 &&
    game.caught === game.criminals.length
  ) {
    game.gameOver = true;

    if (currentLevelIndex < levels.length - 1) {
      levelComplete = true;
      statusText.textContent += " | Premi INVIO per il livello successivo";
    } else {
      statusText.textContent =
        `Gioco completato! Punteggio finale: ${game.score}`;
    }
  }
}

/*
 * checkEscape(criminal): se il criminale (libero) si trova su un'uscita,
 * è fuggito: la partita finisce e il livello è perso.
 */
function checkEscape(criminal) {
  if (criminal.arrested) return;

  const escaped = game.exits.some(e => e.x === criminal.x && e.y === criminal.y);
  if (!escaped) return;

  game.gameOver = true;
  game.lives--;
  updateLives();

  if (game.lives > 0) {
    levelLost = true;
    statusText.textContent =
      `Un criminale è fuggito! Vite rimaste: ${game.lives} | Premi INVIO per riprovare`;
  } else {
    gameLost = true;
    statusText.textContent =
      `GAME OVER | Punteggio finale: ${game.score} | Premi INVIO per ricominciare`;
  }
}
/*
 * updateLives(): mostra le vite rimaste come cuori sotto il titolo.
 */
function updateLives() {
  document.getElementById("lives").textContent =
    game.lives > 0 ? "❤️".repeat(game.lives) : "💀";
}

/*
 * checkBonusLife(): ogni POINTS_PER_LIFE punti regala una vita.
 * livesEarned ricorda quante soglie sono già state premiate, così quando
 * il punteggio viene ripristinato (livello riprovato) la stessa soglia
 * non regala una seconda vita.
 */
function checkBonusLife() {
  const milestones = Math.floor(game.score / POINTS_PER_LIFE);
  if (milestones > game.livesEarned) {
    game.lives += milestones - game.livesEarned;
    game.livesEarned = milestones;
    updateLives();
  }
}
/*
 * Gestione della tastiera e del pulsante:
 * - keydown: quando un tasto viene premuto lo segna come "giù" in keys.
 *   Per frecce, WASD e spazio blocca il comportamento predefinito del browser
 *   (che altrimenti farebbe scorrere la pagina). Il tasto R riavvia la partita.
 * - keyup: quando il tasto viene rilasciato lo segna come "su".
 * - click sul pulsante "Nuova partita": riavvia la partita.
 * Nota: qui i tasti vengono solo registrati; il movimento vero avviene in loop().
 */
document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
    e.preventDefault();
  }
  keys[k] = true;
  if (k === "r") restart();
  if (
    e.key === "Enter" &&
    game.gameOver &&
    levelComplete
  ) {
    loadLevel(currentLevelIndex + 1);
  }
  if (e.key === "Enter" && game.gameOver && levelLost) {
    game.score = scoreAtLevelStart;
    loadLevel(currentLevelIndex);
  }
  if (e.key === "Enter" && game.gameOver && gameLost) {
    restart();
  }
});
document.getElementById("restart").addEventListener("click", e => {
  restart();
  e.currentTarget.blur();
});
document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; })

/*
 * ===================== GRAFICA ARCADE =====================
 * Tutto quello che segue serve solo a disegnare: la logica di gioco
 * (movimento a caselle, catture, fughe) resta quella sopra.
 */

/*
 * Sprite in pixel art. Ogni sprite è una griglia di 12 colonne: ogni carattere
 * è un "pixel grande" (U pixel veri) e la lettera dice quale colore usare
 * dalla tavolozza del personaggio; "." = trasparente.
 * Qui c'è solo la parte alta (testa e busto, 10 righe): gambe e mani vengono
 * disegnate a parte perché si muovono durante la camminata.
 * Per guardare a sinistra si usa lo sprite "right" specchiato.
 */
const U = 3;                 // dimensione di un pixel dello sprite
const SPRITE_COLS = 12;
const SPRITE_ROWS = 13;      // 10 righe di busto + 3 di gambe
const WALK_FRAME_MS = 110;   // durata di un fotogramma della camminata

const SPRITES = {
  maigret: {
    down: [
      "...HHHHHH...",
      "...HHHHHH...",
      ".HHhhhhhhHH.",
      "...SSSSSS...",
      "...SESSES...",
      "...SSSSSSPP.",
      "..CCcWWcCC..",
      ".CCCCBBCCCC.",
      ".CCCcBBcCCC.",
      ".CCCCBBCCCC."
    ],
    up: [
      "...HHHHHH...",
      "...HHHHHH...",
      ".HHhhhhhhHH.",
      "...RRRRRR...",
      "...RRRRRR...",
      "...SSSSSS...",
      "..CCCCCCCC..",
      ".CCCCCCCCCC.",
      ".CCCCccCCCC.",
      ".CCCCccCCCC."
    ],
    right: [
      "...HHHHHH...",
      "...HHHHHH...",
      "..HhhhhhhHHH",
      "...RSSSSS...",
      "...RSSSES...",
      "...SSSSSSPPP",
      "....CCWCC...",
      "...CCCCCCC..",
      "...CCCBCCC..",
      "...CCCCCCC.."
    ]
  },
  criminal: {
    down: [
      "............",
      "...KKKKKK...",
      "..KKKKKKKK..",
      "...SSSSSS...",
      "...MEMMEM...",
      "...SSSSSS...",
      "..TTTTTTTT..",
      ".tttttttttt.",
      ".TTTTTTTTTT.",
      ".tttttttttt."
    ],
    up: [
      "............",
      "...KKKKKK...",
      "..KKKKKKKK..",
      "...RRRRRR...",
      "...RRRRRR...",
      "...SSSSSS...",
      "..TTTTTTTT..",
      ".tttttttttt.",
      ".TTTTTTTTTT.",
      ".tttttttttt."
    ],
    right: [
      "............",
      "...KKKKKK...",
      "...KKKKKKKK.",
      "...RSSSSS...",
      "...RMMMEM...",
      "...SSSSSS...",
      "...TTTTTTT..",
      "...ttttttt..",
      "...TTTTTTT..",
      "...ttttttt.."
    ]
  }
};

/*
 * Tavolozze: Maigret ha impermeabile e cappello marroni e la pipa;
 * i criminali hanno la maglia a righe nel colore della loro personalità.
 * L = pantaloni, F = scarpe (usati per le gambe).
 */
const MAIGRET_PALETTE = {
  H: "#4a3222", h: "#111111", S: "#f5c9a0", E: "#111111", R: "#4b3621",
  P: "#7c4a1e", C: "#b7791f", c: "#8a5a14", B: "#5b3a0f", W: "#f8fafc",
  L: "#3f3f46", F: "#111111"
};

function criminalPalette(color) {
  return {
    K: "#1f2937", S: "#f2c29b", M: "#0a0a0a", E: "#ffffff", R: "#3b2a1a",
    T: color, t: "#111827", L: "#374151", F: "#000000"
  };
}

/*
 * getVisual(entity): restituisce (creandolo la prima volta) lo stato grafico
 * del personaggio: posizione disegnata rx/ry (in caselle, anche con decimali),
 * direzione, tempo di camminata e da quanto è fermo.
 */
function getVisual(entity) {
  let v = visuals.get(entity);
  if (!v) {
    v = { rx: entity.x, ry: entity.y, dir: "down", walkTime: 0, still: 1000 };
    visuals.set(entity, v);
  }
  return v;
}

/*
 * updateVisual(entity, stepMs, dt): fa scorrere la posizione disegnata verso
 * la casella vera, alla velocità di una casella ogni stepMs millisecondi
 * (cioè la stessa velocità del movimento logico), così il passaggio tra
 * caselle è fluido invece che a scatti. Se la distanza è grande (ritorno in
 * cella, nuovo livello) il personaggio viene teletrasportato.
 */
function updateVisual(entity, stepMs, dt) {
  const v = getVisual(entity);
  const dx = entity.x - v.rx;
  const dy = entity.y - v.ry;
  const dist = Math.abs(dx) + Math.abs(dy);

  if (dist > 2) {
    v.rx = entity.x;
    v.ry = entity.y;
    return;
  }

  if (dist > 0) {
    if (Math.abs(dx) > Math.abs(dy)) v.dir = dx > 0 ? "right" : "left";
    else v.dir = dy > 0 ? "down" : "up";

    // "budget" di movimento di questo fotogramma, distribuito prima su x poi su y
    let budget = dt / Math.max(stepMs, 1);
    const mx = Math.sign(dx) * Math.min(Math.abs(dx), budget);
    v.rx += mx;
    budget -= Math.abs(mx);
    v.ry += Math.sign(dy) * Math.min(Math.abs(dy), budget);

    v.walkTime += dt;
    v.still = 0;
  } else {
    v.still += dt;
  }
}

/*
 * isWalking(v): il personaggio viene considerato "in cammino" anche per
 * un attimo dopo essere arrivato, così tenendo premuta una freccia le gambe
 * non si fermano tra un passo e l'altro.
 */
function isWalking(v) {
  return v.still < 90;
}

/*
 * drawBitmap(rows, left, top, palette, mirror): disegna una griglia di
 * caratteri come pixel grandi. mirror = true la specchia in orizzontale.
 */
function drawBitmap(rows, left, top, palette, mirror) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const color = palette[row[c]];
      if (!color) continue;
      const col = mirror ? SPRITE_COLS - 1 - c : c;
      ctx.fillStyle = color;
      ctx.fillRect(left + col * U, top + r * U, U, U);
    }
  }
}

/*
 * block(left, col, y, cols, h, color, mirror): disegna un rettangolo largo
 * "cols" pixel di sprite a partire dalla colonna col, alto h pixel veri.
 * Serve per gambe e mani, rispettando lo specchio.
 */
function block(left, col, y, cols, h, color, mirror) {
  const c = mirror ? SPRITE_COLS - col - cols : col;
  ctx.fillStyle = color;
  ctx.fillRect(left + c * U, y, cols * U, h);
}

/*
 * drawLegs: gambe animate su 4 fotogrammi.
 * - Di fronte/di spalle: una gamba alla volta si solleva.
 * - Di profilo: gambe unite e poi divaricate, come un passo.
 */
function drawLegs(left, legTop, feetY, side, frame, palette, mirror) {
  const pants = palette.L;
  const shoes = palette.F;

  if (!side) {
    const legs = [
      { col: 3, lift: frame === 1 ? U : 0 },
      { col: 7, lift: frame === 3 ? U : 0 }
    ];
    for (const leg of legs) {
      const bottom = feetY - leg.lift;
      block(left, leg.col, legTop, 2, bottom - U - legTop, pants, mirror);
      block(left, leg.col, bottom - U, 2, U, shoes, mirror);
    }
    return;
  }

  if (frame % 2 === 0) {
    // gambe unite
    block(left, 5, legTop, 2, feetY - U - legTop, pants, mirror);
    block(left, 5, feetY - U, 3, U, shoes, mirror);
  } else {
    // passo: gamba dietro e gamba avanti, quella dietro col tallone sollevato
    block(left, 3, legTop, 2, feetY - U - legTop, pants, mirror);
    block(left, 2, feetY - 2 * U, 3, U, shoes, mirror);
    block(left, 7, legTop, 2, feetY - U - legTop, pants, mirror);
    block(left, 7, feetY - U, 3, U, shoes, mirror);
  }
}

/*
 * drawHands: le mani oscillano avanti e indietro mentre si cammina.
 */
function drawHands(left, bodyTop, side, frame, palette, mirror) {
  const swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  if (side) {
    block(left, 6 + swing * 2, bodyTop + 8 * U, 1, U, palette.S, mirror);
  } else {
    block(left, 0, bodyTop + (8 - swing) * U, 1, U, palette.S, mirror);
    block(left, 11, bodyTop + (8 + swing) * U, 1, U, palette.S, mirror);
  }
}

/*
 * drawCharacter(entity, sprite, palette, pipe): disegna un personaggio nella
 * sua posizione fluida, con ombra, gambe e mani animate, e un piccolo
 * rimbalzo del corpo a ogni passo. Da fermo "respira" (sale e scende di 1px).
 * Se pipe è true (Maigret) dalla pipa esce un filo di fumo quando è fermo.
 */
function drawCharacter(entity, sprite, palette, pipe = false) {
  const v = getVisual(entity);
  const walking = isWalking(v);
  const frame = walking ? Math.floor(v.walkTime / WALK_FRAME_MS) % 4 : 0;
  const bob = walking ? (frame % 2 === 0 ? -2 : 0) : (Math.floor(now / 600) % 2 ? -1 : 0);

  const cx = v.rx * TILE + TILE / 2;
  const feetY = Math.round(v.ry * TILE + TILE - 2);
  const left = Math.round(cx - (SPRITE_COLS / 2) * U);
  const bodyTop = feetY - SPRITE_ROWS * U + bob;
  const side = v.dir === "left" || v.dir === "right";
  const mirror = v.dir === "left";

  // Ombra
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx, feetY, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  drawLegs(left, bodyTop + 10 * U, feetY, side, frame, palette, mirror);
  drawBitmap(sprite[side ? "right" : v.dir], left, bodyTop, palette, mirror);
  drawHands(left, bodyTop, side, frame, palette, mirror);

  // Fumo della pipa: due sbuffi che salgono e svaniscono
  if (pipe && !walking && v.dir !== "up") {
    const pipeCol = side ? 11 : 10;
    const px = left + (mirror ? SPRITE_COLS - 1 - pipeCol : pipeCol) * U;
    const py = bodyTop + 5 * U;
    for (let i = 0; i < 2; i++) {
      const t = ((now + i * 700) % 1400) / 1400;
      ctx.fillStyle = `rgba(226, 232, 240, ${0.7 * (1 - t)})`;
      ctx.fillRect(px + Math.round(Math.sin(t * 6) * 2), py - 4 - t * 16, U - 1, U - 1);
    }
  }
}

/*
 * buildBackground(): disegna la mappa del livello su un canvas "nascosto",
 * una sola volta per livello (le parti fisse non cambiano mai).
 * - Pavimento nero con un puntino tenue al centro di ogni casella.
 * - Muri in stile labirinto arcade: contorno al neon blu tracciato solo sui
 *   lati che confinano con il pavimento, così i muri vicini formano un unico
 *   blocco con corridoi continui.
 * - Celle "C": sbarre verdi luminose.
 * Le uscite sono animate e vengono disegnate a ogni fotogramma in draw().
 */
function buildBackground() {
  background = document.createElement("canvas");
  background.width = canvas.width;
  background.height = canvas.height;
  const g = background.getContext("2d");
  const I = 7; // rientro del contorno al neon dal bordo della casella

  g.fillStyle = "#000000";
  g.fillRect(0, 0, background.width, background.height);

  const open = (x, y) => !wall(game, x, y);
  const lines = new Path2D();

  for (let y = 0; y < game.ROWS; y++) {
    for (let x = 0; x < game.COLS; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const tile = map[y][x];

      if (tile !== "#") {
        if (tile !== "E") {
          g.fillStyle = "#1e2a44";
          g.fillRect(px + TILE / 2 - 1, py + TILE / 2 - 1, 2, 2);
        }
        if (tile === "C") drawCellBars(g, px, py);
        continue;
      }

      g.fillStyle = "#060a26";
      g.fillRect(px, py, TILE, TILE);

      const up = open(x, y - 1), down = open(x, y + 1);
      const leftOpen = open(x - 1, y), rightOpen = open(x + 1, y);
      const x0 = leftOpen ? px + I : px;
      const x1 = rightOpen ? px + TILE - I : px + TILE;
      const y0 = up ? py + I : py;
      const y1 = down ? py + TILE - I : py + TILE;

      // Lati che confinano con il pavimento
      if (up) { lines.moveTo(x0, py + I); lines.lineTo(x1, py + I); }
      if (down) { lines.moveTo(x0, py + TILE - I); lines.lineTo(x1, py + TILE - I); }
      if (leftOpen) { lines.moveTo(px + I, y0); lines.lineTo(px + I, y1); }
      if (rightOpen) { lines.moveTo(px + TILE - I, y0); lines.lineTo(px + TILE - I, y1); }

      // Angoli "interni": muro a lato e sopra/sotto, pavimento solo in diagonale
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!open(x + dx, y) && !open(x, y + dy) && open(x + dx, y + dy)) {
          const cx = dx < 0 ? px + I : px + TILE - I;
          const cy = dy < 0 ? py + I : py + TILE - I;
          lines.moveTo(dx < 0 ? px : px + TILE, cy);
          lines.lineTo(cx, cy);
          lines.lineTo(cx, dy < 0 ? py : py + TILE);
        }
      }
    }
  }

  // Doppio tratto: uno spesso con alone e uno sottile e chiaro al centro
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = "#3b82f6";
  g.shadowBlur = 12;
  g.strokeStyle = "#2563eb";
  g.lineWidth = 4;
  g.stroke(lines);
  g.shadowBlur = 0;
  g.strokeStyle = "#bfdbfe";
  g.lineWidth = 1.2;
  g.stroke(lines);
}

/*
 * drawCellBars(g, px, py): disegna una cella della prigione con sbarre al neon.
 */
function drawCellBars(g, px, py) {
  g.save();
  g.fillStyle = "rgba(34, 197, 94, 0.12)";
  g.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
  g.shadowColor = "#22c55e";
  g.shadowBlur = 8;
  g.strokeStyle = "#4ade80";
  g.lineWidth = 2;
  g.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
  g.beginPath();
  for (let i = 1; i <= 3; i++) {
    const bx = px + 5 + i * (TILE - 10) / 4;
    g.moveTo(bx, py + 5);
    g.lineTo(bx, py + TILE - 5);
  }
  g.stroke();
  g.restore();
}

/*
 * drawExit(e): uscita rossa lampeggiante con frecce che scorrono verso
 * l'esterno della mappa, così si capisce dove i criminali vogliono scappare.
 */
function drawExit(e) {
  const px = e.x * TILE;
  const py = e.y * TILE;
  const pulse = 0.5 + 0.5 * Math.sin(now / 180);

  ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + 0.3 * pulse})`;
  ctx.fillRect(px, py, TILE, TILE);

  let angle = Math.PI / 2;                       // in basso
  if (e.x === 0) angle = Math.PI;                // a sinistra
  else if (e.x === game.COLS - 1) angle = 0;     // a destra
  else if (e.y === 0) angle = -Math.PI / 2;      // in alto

  ctx.save();
  ctx.translate(px + TILE / 2, py + TILE / 2);
  ctx.rotate(angle);
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 3;
  ctx.lineCap = "square";
  const shift = (Math.floor(now / 140) % 3) * 3;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const x0 = -8 + i * 10 + shift;
    ctx.moveTo(x0 - 4, -7);
    ctx.lineTo(x0 + 3, 0);
    ctx.lineTo(x0 - 4, 7);
  }
  ctx.stroke();
  ctx.restore();
}

/*
 * spawnCaptureEffect(c): alla cattura fa esplodere scintille del colore del
 * criminale e fa salire la scritta "+100".
 */
function spawnCaptureEffect(c) {
  const v = getVisual(c);
  const cx = v.rx * TILE + TILE / 2;
  const cy = v.ry * TILE + TILE / 2;

  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.05 + Math.random() * 0.15;
    effects.push({
      type: "spark", x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 600, max: 600, color: i % 2 ? c.color : "#ffffff"
    });
  }
  effects.push({ type: "text", x: cx, y: cy - 12, vx: 0, vy: -0.035, life: 900, max: 900, text: "+100" });
}

/*
 * updateEffects(dt): muove gli effetti e toglie quelli esauriti.
 */
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.life -= dt;
    if (e.life <= 0) effects.splice(i, 1);
  }
}

/*
 * drawEffects(): disegna scintille (quadratini che svaniscono) e scritte.
 */
function drawEffects() {
  for (const e of effects) {
    ctx.globalAlpha = Math.max(e.life / e.max, 0);
    if (e.type === "spark") {
      ctx.fillStyle = e.color;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), U, U);
    } else {
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#9d174d";
      ctx.fillText(e.text, e.x + 2, e.y + 2);
      ctx.fillStyle = "#fde047";
      ctx.fillText(e.text, e.x, e.y);
    }
  }
  ctx.globalAlpha = 1;
}

/*
 * fitFont(text, maxSize): sceglie una dimensione del font pixel che faccia
 * stare il testo nella larghezza del canvas (i livelli hanno larghezze diverse).
 */
function fitFont(text, maxSize) {
  const size = Math.min(maxSize, Math.floor((canvas.width * 0.9) / text.length));
  return `${size}px "Press Start 2P", monospace`;
}

/*
 * draw(): ridisegna l'intera scena da zero.
 * 1. Copia lo sfondo del livello (muri, pavimento, celle) già pronto.
 * 2. Disegna le uscite lampeggianti.
 * 3. Disegna i criminali non ancora arrestati e poi Maigret, ordinati dall'alto
 *    in basso così chi sta più in basso copre chi sta dietro.
 * 4. Disegna gli effetti delle catture.
 * 5. Se la partita è finita, sovrappone la schermata di fine livello / game over.
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (background) ctx.drawImage(background, 0, 0);

  for (const e of game.exits) drawExit(e);

  // Personaggi, ordinati per riga disegnata
  const actors = game.criminals
    .filter(c => !c.arrested)
    .map(c => ({ entity: c, sprite: SPRITES.criminal, palette: criminalPalette(c.color), pipe: false }));
  actors.push({ entity: game.player, sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, pipe: true });
  actors.sort((a, b) => getVisual(a.entity).ry - getVisual(b.entity).ry);
  for (const a of actors) drawCharacter(a.entity, a.sprite, a.palette, a.pipe);

  drawEffects();

  // Schermata di fine partita o completamento livello
  if (game.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let message = "PARTITA TERMINATA";
    let subtitle = "PREMI R PER RICOMINCIARE";
    let color = "#fde047";

    if (gameLost) {
      message = "GAME OVER";
      subtitle = "PREMI INVIO PER RICOMINCIARE";
      color = "#f87171";
    } else if (levelLost) {
      message = "UN CRIMINALE È FUGGITO!";
      subtitle = "PREMI INVIO PER RIPROVARE";
      color = "#f87171";
    } else if (levelComplete) {
      message = "LIVELLO COMPLETATO!";
      subtitle = "PREMI INVIO PER CONTINUARE";
    } else if (
      currentLevelIndex === levels.length - 1 &&
      game.caught === game.criminals.length
    ) {
      message = "GIOCO COMPLETATO!";
      subtitle = "HAI CATTURATO TUTTI I CRIMINALI!";
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Titolo con ombra squadrata e alone, come nei cabinati
    ctx.font = fitFont(message, 24);
    ctx.fillStyle = "#701a75";
    ctx.fillText(message, canvas.width / 2 + 3, canvas.height / 2 - 18 + 3);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 18);
    ctx.shadowBlur = 0;

    // Sottotitolo lampeggiante
    if (Math.floor(now / 500) % 2 === 0) {
      ctx.font = fitFont(subtitle, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 26);
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}



/*
 * loop(time): il ciclo di gioco, chiamato dal browser circa 60 volte al secondo
 * tramite requestAnimationFrame; "time" è il tempo trascorso in millisecondi.
 * - Giocatore: al massimo un passo ogni playerDelay ms. Legge i tasti premuti e
 *   sceglie UNA sola direzione (priorità: su, giù, sinistra, destra — niente
 *   diagonali); se c'è una direzione, muove Maigret e memorizza l'istante del passo.
 * - Criminali: si muovono tutti insieme ogni criminalDelay ms.
 * - Grafica: fa scorrere le posizioni disegnate verso quelle vere, aggiorna
 *   gli effetti, ridisegna la scena e si ri-prenota per il fotogramma successivo.
 */
function loop(time) {
  const dt = lastFrame ? Math.min(time - lastFrame, 100) : 16;
  lastFrame = time;
  now = time;

  if (!game.gameOver && time - lastPlayerMove > playerDelay) {
    let dx = 0, dy = 0;
    if (keys.arrowup || keys.w) dy = -1;
    else if (keys.arrowdown || keys.s) dy = 1;
    else if (keys.arrowleft || keys.a) dx = -1;
    else if (keys.arrowright || keys.d) dx = 1;

    if (dx || dy) {
      // Maigret si gira verso la direzione premuta anche se davanti c'è un muro
      getVisual(game.player).dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
      movePlayer(dx, dy);
      lastPlayerMove = time;
    }
  }

  if (!game.gameOver && time - lastEnemyMove > criminalDelay) {
    moveCriminals(game);
    lastEnemyMove = time;
  }

  updateVisual(game.player, playerDelay, dt);
  for (const c of game.criminals) updateVisual(c, criminalDelay, dt);
  updateEffects(dt);

  draw();
  requestAnimationFrame(loop);
}

/*
 * Avvio: prepara la prima partita e fa partire il ciclo di gioco.
 */
restart();
requestAnimationFrame(loop);
