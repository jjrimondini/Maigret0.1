/*
 * main.js — Cuore del gioco "Guardie e Ladri".
 * Gestisce la mappa, il giocatore (il commissario Maigret), la cattura dei criminali,
 * l'input da tastiera, la schermata iniziale, la pausa, il disegno sul canvas
 * e il ciclo di gioco.
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
 * Power-up "palla al piede": nella mappa è la lettera "B" (ball).
 * Quando Maigret ci passa sopra, per SHACKLE_DURATION ms tutti i criminali
 * hanno la palla al piede e vanno SHACKLE_SLOWDOWN volte più lenti.
 * Per i criminali la "B" è un normale corridoio: ci passano sopra senza effetti.
 */
const SHACKLE_TILE = "B";
const SHACKLE_DURATION = 10000;
const SHACKLE_SLOWDOWN = 2;

/*
 * Power-up "sbarre alle uscite": nella mappa è la lettera "S" (sbarre).
 * Quando Maigret ci passa sopra, per BARS_DURATION ms tutte le uscite "E"
 * sono chiuse da sbarre e diventano muri. Per i criminali la "S" è un
 * normale corridoio: ci passano sopra senza effetti.
 */
const BARS_TILE = "S";
const BARS_DURATION = 10000;


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
let shackleTiles = [];   // caselle del power-up: { x, y, available }
let shackleTimeLeft = 0; // ms rimanenti dell'effetto (> 0 = criminali incatenati)
let barsTiles = [];      // caselle del power-up sbarre: { x, y, available }
let barsTimeLeft = 0;    // ms rimanenti dell'effetto (> 0 = uscite sbarrate)
let lockedMap = [];      // copia della mappa con le uscite trasformate in muri

/*
 * currentCriminalDelay(): il ritardo tra un passo e l'altro dei criminali,
 * raddoppiato mentre hanno la palla al piede.
 */
function currentCriminalDelay() {
  return criminalDelay * (shackleTimeLeft > 0 ? SHACKLE_SLOWDOWN : 1);
}

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
 * - DIRS: per ogni tasto di direzione, lo spostamento [dx, dy] che produce
 * - dirKeys: tasti di direzione tenuti premuti, in ordine di pressione
 *   (l'ultimo è il più recente), così con due tasti insieme funzionano entrambi
 */
let lastPlayerMove = 0;
let lastEnemyMove = 0;
const keys = {};
const DIRS = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0]
};
const dirKeys = [];

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
 * Schermate:
 * - screen: "title" (schermata iniziale) oppure "playing" (partita in corso)
 * - paused: true mentre il gioco è in pausa (tasto ESC)
 * - escapedCriminal: il criminale che è appena fuggito, per mostrarlo
 *   sul volantino "RICERCATO"
 */
let screen = "title";
let paused = false;
let escapedCriminal = null;

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
  shackleTiles = findTiles(map, SHACKLE_TILE).map(t => ({ ...t, available: true }));
  shackleTimeLeft = 0;
  barsTiles = findTiles(map, BARS_TILE).map(t => ({ ...t, available: true }));
  barsTimeLeft = 0;
  // Copia (non modifica l'array di levels.js, che serve intatto se si riprova il livello)
  lockedMap = map.map(row => row.replaceAll("E", "#"));

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
    checkShackle();
    checkBars();
    checkCapture();
  }
}

/*
 * checkShackle(): se Maigret entra in una casella con la palla al piede
 * (ancora disponibile), la raccoglie: l'icona sparisce dalla mappa e per
 * SHACKLE_DURATION ms i criminali sono incatenati e rallentati.
 * Se l'effetto era già attivo, il countdown riparte da capo.
 */
function checkShackle() {
  const tile = shackleTiles.find(t =>
    t.available && t.x === game.player.x && t.y === game.player.y
  );
  if (!tile) return;

  tile.available = false;
  shackleTimeLeft = SHACKLE_DURATION;
  spawnPowerUpEffect(tile, "PALLA AL PIEDE!", ["#9ca3af", "#fb923c"]);
}

/*
 * checkBars(): se Maigret entra in una casella con le sbarre (ancora
 * disponibile), la raccoglie: per BARS_DURATION ms le uscite sono sbarrate.
 * Il trucco: game.map (quella che leggono wall() e quindi i criminali)
 * diventa la copia in cui le uscite sono muri "#".
 * Se l'effetto era già attivo, il countdown riparte da capo.
 */
function checkBars() {
  const tile = barsTiles.find(t =>
    t.available && t.x === game.player.x && t.y === game.player.y
  );
  if (!tile) return;

  tile.available = false;
  barsTimeLeft = BARS_DURATION;
  game.map = lockedMap;
  spawnPowerUpEffect(tile, "USCITE SBARRATE!", ["#9ca3af", "#4ade80"]);
  for (const e of game.exits) spawnPowerUpEffect(e, null, ["#e5e7eb", "#4ade80"]);
}

/*
 * updateBars(dt): fa scorrere il countdown delle sbarre. Allo scadere le
 * uscite si riaprono (torna la mappa originale) e le icone ricompaiono.
 */
function updateBars(dt) {
  if (barsTimeLeft <= 0) return;
  barsTimeLeft -= dt;
  if (barsTimeLeft <= 0) {
    barsTimeLeft = 0;
    game.map = map;
    for (const t of barsTiles) t.available = true;
  }
}

/*
 * updateShackle(dt): fa scorrere il countdown della palla al piede.
 * Allo scadere l'effetto svanisce e le icone tornano disponibili sulla mappa.
 */
function updateShackle(dt) {
  if (shackleTimeLeft <= 0) return;
  shackleTimeLeft -= dt;
  if (shackleTimeLeft <= 0) {
    shackleTimeLeft = 0;
    for (const t of shackleTiles) t.available = true;
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
        `Gioco completato! Punteggio finale: ${game.score} | Premi INVIO per tornare al menu`;
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
  escapedCriminal = criminal;
  game.lives--;
  updateLives();

  if (game.lives > 0) {
    levelLost = true;
    statusText.textContent =
      `Un criminale è fuggito! Vite rimaste: ${game.lives} | Premi INVIO per riprovare`;
  } else {
    gameLost = true;
    statusText.textContent =
      `GAME OVER | Punteggio finale: ${game.score} | Premi INVIO per tornare al menu`;
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
 * startGame(): inizia una nuova partita dal primo livello ("INSERT COIN").
 */
function startGame() {
  restart();
  screen = "playing";
  paused = false;
}

/*
 * showTitle(): torna alla schermata iniziale. Carica il primo livello solo
 * per dare al canvas le dimensioni giuste; nessuno si muove finché non si gioca.
 */
function showTitle() {
  restart();
  screen = "title";
  paused = false;
  document.getElementById("level-info").textContent = "MENU";
  statusText.textContent = "INSERT COIN O PREMI INVIO PER GIOCARE";
}

/*
 * togglePause(): mette in pausa o riprende, solo durante una partita in corso.
 * Alla ripresa i timer ripartono da adesso, così nessuno fa un passo "di colpo".
 */
function togglePause() {
  if (screen !== "playing" || game.gameOver) return;
  paused = !paused;
  if (!paused) {
    lastPlayerMove = now;
    lastEnemyMove = now;
  }
}

/*
 * Gestione della tastiera e del pulsante:
 * - keydown: quando un tasto viene premuto lo segna come "giù" in keys.
 *   Per frecce, WASD e spazio blocca il comportamento predefinito del browser
 *   (che altrimenti farebbe scorrere la pagina).
 *   Sulla schermata iniziale INVIO fa partire la partita; durante il gioco
 *   ESC mette in pausa, R ricomincia e INVIO a fine livello prosegue,
 *   riprova il livello oppure (game over / gioco finito) torna al menu.
 * - keyup: quando il tasto viene rilasciato lo segna come "su".
 * - click sul pulsante "INSERT COIN": inizia una nuova partita.
 * - blur: se la finestra perde il focus il gioco va in pausa da solo.
 * Nota: qui i tasti vengono solo registrati; il movimento vero avviene in loop().
 */
document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
    e.preventDefault();
  }
  keys[k] = true;
  if (k in DIRS && !e.repeat) {
    const i = dirKeys.indexOf(k);
    if (i !== -1) dirKeys.splice(i, 1);
    dirKeys.push(k);
  }

  if (screen === "title") {
    if (e.key === "Enter") startGame();
    return;
  }

  if (k === "escape") {
    togglePause();
    return;
  }
  if (paused) return;

  if (k === "r") startGame();
  if (e.key === "Enter" && game.gameOver) {
    if (levelComplete) {
      loadLevel(currentLevelIndex + 1);
    } else if (levelLost) {
      game.score = scoreAtLevelStart;
      loadLevel(currentLevelIndex);
    } else {
      // game over oppure gioco completato
      showTitle();
    }
  }
});
document.getElementById("restart").addEventListener("click", e => {
  startGame();
  e.currentTarget.blur();
});
document.addEventListener("keyup", e => {
  const k = e.key.toLowerCase();
  keys[k] = false;
  const i = dirKeys.indexOf(k);
  if (i !== -1) dirKeys.splice(i, 1);
});
window.addEventListener("blur", () => {
  for (const k in keys) keys[k] = false;
  dirKeys.length = 0;
  if (screen === "playing" && !game.gameOver && !paused) togglePause();
});

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
 * drawSprite(cx, feetY, opts): disegna un personaggio in un punto qualsiasi
 * (in pixel: cx = centro orizzontale, feetY = dove poggiano i piedi), con
 * ombra, gambe e mani animate e un piccolo rimbalzo del corpo a ogni passo.
 * Da fermo "respira" (sale e scende di 1px).
 * opts:
 * - sprite, palette: quale personaggio e con quali colori
 * - dir: "up" | "down" | "left" | "right"
 * - walking, walkTime: se sta camminando e da quanto (per il fotogramma)
 * - pipe: dalla pipa esce un filo di fumo quando è fermo (Maigret)
 * - hatUp: Maigret alza il cappello per salutare (schermata di vittoria)
 * - sack: il ladro porta sulle spalle il sacco del bottino
 * - shackled: il ladro ha la palla al piede (cammina più lento e la trascina)
 * È usata sia in gioco (drawCharacter) sia nelle schermate (menu, pausa, fine).
 */
function drawSprite(cx, feetY, opts) {
  const { sprite, palette, dir = "down", walking = false, walkTime = 0, shackled = false } = opts;
  // Con la palla al piede la camminata è più lenta e "pesante" (rimbalzo ridotto)
  const frameMs = shackled ? WALK_FRAME_MS * 2 : WALK_FRAME_MS;
  const frame = walking ? Math.floor(walkTime / frameMs) % 4 : 0;
  const bob = walking ? (frame % 2 === 0 ? (shackled ? -1 : -2) : 0) : (Math.floor(now / 600) % 2 ? -1 : 0);

  const left = Math.round(cx - (SPRITE_COLS / 2) * U);
  const bodyTop = feetY - SPRITE_ROWS * U + bob;
  const side = dir === "left" || dir === "right";
  const mirror = dir === "left";
  let rows = sprite[side ? "right" : dir];

  // Ombra
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx, feetY, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sacco del bottino, dietro la schiena (va disegnato prima del corpo)
  if (opts.sack && side) {
    block(left, 0, bodyTop + 2 * U, 4, 6 * U, "#713f12", mirror);
    block(left, 1, bodyTop + 3 * U, 2, 4 * U, "#ca8a04", mirror);
    block(left, 3, bodyTop + 2 * U, 2, U, "#713f12", mirror);
  }

  // Cappello alzato: al posto del cappello si vedono i capelli
  if (opts.hatUp && !side) {
    rows = ["............", "............", "...RRRRRR...", ...rows.slice(3)];
  }

  // Palla al piede: dietro al personaggio va disegnata prima del corpo,
  // davanti (quando cammina verso l'alto) dopo
  const shackle = shackled ? shackleGeometry(cx, left, feetY, dir, side, mirror, walking, frame) : null;
  if (shackle && !shackle.front) drawBallAndChain(shackle);

  drawLegs(left, bodyTop + 10 * U, feetY, side, frame, palette, mirror);
  if (shackle) drawAnkleCuff(shackle);
  drawBitmap(rows, left, bodyTop, palette, mirror);
  drawHands(left, bodyTop, side, frame, palette, mirror);

  if (shackle && shackle.front) drawBallAndChain(shackle);

  if (opts.hatUp && !side) {
    // braccio alzato e cappello che sventola sopra la testa
    const wave = Math.round(Math.sin(now / 150) * 2);
    block(left, 11, bodyTop, 1, 7 * U, palette.C, mirror);
    block(left, 11, bodyTop - U + wave, 1, U + 2, palette.S, mirror);
    drawBitmap(sprite.down.slice(0, 3), left + U, bodyTop - 4 * U + wave, palette, mirror);
  }

  // Fumo della pipa: due sbuffi che salgono e svaniscono
  if (opts.pipe && !walking && dir !== "up" && !opts.hatUp) {
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
 * shackleGeometry(...): calcola dove stanno cavigliera, catena e palla di un
 * ladro incatenato, in base a dove guarda e al fotogramma della camminata.
 * - Di profilo: la palla resta dietro, sul lato opposto alla direzione.
 * - Di fronte (dir "down"): la palla è dietro di lui, di lato e un po' più in alto.
 * - Di spalle (dir "up"): la palla è "davanti" a noi, più in basso, e copre le gambe.
 * Mentre cammina la palla viene trascinata a strattoni: a ogni passo si
 * avvicina di qualche pixel, fa un piccolo saltello e la catena si tende.
 */
function shackleGeometry(cx, left, feetY, dir, side, mirror, walking, frame) {
  const pulling = walking && frame % 2 === 1;
  let legCol, lift, bx, by, front = false;

  if (side) {
    legCol = frame % 2 === 0 ? 5 : 3;      // gamba dietro (vedi drawLegs)
    lift = frame % 2 === 0 ? 0 : U;        // tallone sollevato nel passo
    const back = mirror ? 1 : -1;          // lato opposto alla direzione
    bx = cx + back * (pulling ? 14 : 17);
    by = feetY - 4;
  } else if (dir === "up") {
    legCol = 3;
    lift = frame === 1 ? U : 0;
    bx = cx - (pulling ? 10 : 12);
    by = feetY + 1;
    front = true;
  } else {
    legCol = 7;
    lift = frame === 3 ? U : 0;
    bx = cx + (pulling ? 11 : 13);
    by = feetY - 7;
  }
  if (pulling) by -= 1; // saltello della palla trascinata

  const ankleY = feetY - lift - U - 2;
  const col = mirror ? SPRITE_COLS - legCol - 2 : legCol;
  return {
    left, legCol, mirror, ankleY,
    ax: left + col * U + U, ay: ankleY + 1,
    bx, by, front,
    sag: pulling ? 0 : 3 // catena tesa quando tira, morbida da fermo
  };
}

/*
 * drawAnkleCuff(s): la cavigliera di ferro sopra la scarpa.
 */
function drawAnkleCuff(s) {
  block(s.left, s.legCol, s.ankleY, 2, 2, "#9ca3af", s.mirror);
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(s.ax - 1, s.ankleY, 1, 1);
}

/*
 * drawBallAndChain(s): catena a maglie (con un po' di "pancia" quando è
 * allentata) dalla caviglia alla palla di ferro, con ombra e riflesso.
 */
function drawBallAndChain(s) {
  const R = 5;
  // Ombra della palla
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.ellipse(s.bx, s.by + R - 1, R + 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Catena: maglie alternate chiare e scure
  const links = 5;
  const endY = s.by - R + 2;
  for (let i = 1; i < links; i++) {
    const t = i / links;
    const x = s.ax + (s.bx - s.ax) * t;
    const y = s.ay + (endY - s.ay) * t + Math.sin(t * Math.PI) * s.sag;
    ctx.fillStyle = i % 2 ? "#9ca3af" : "#6b7280";
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }

  // Palla di ferro
  ctx.fillStyle = "#0b0f19";
  ctx.beginPath();
  ctx.arc(s.bx, s.by, R + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#374151";
  ctx.beginPath();
  ctx.arc(s.bx, s.by, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(Math.round(s.bx), Math.round(s.by) + 1, 3, 3);
  ctx.fillStyle = "#d1d5db";
  ctx.fillRect(Math.round(s.bx) - 3, Math.round(s.by) - 3, 2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(s.bx) - 3, Math.round(s.by) - 3, 1, 1);
}

/*
 * Icone dei power-up in pixel art (pixel più piccoli degli sprite).
 * - Palla al piede: cavigliera aperta in alto, catena e palla di ferro con riflesso.
 * - Sbarre: telaio d'acciaio con quattro sbarre, una traversa e un lucchetto dorato.
 */
const SHACKLE_ICON = [
  ".GGGG.....",
  "G....G....",
  "G....G....",
  ".GGgG.....",
  "....g.....",
  ".....G....",
  "....OOOO..",
  "...OBWBBO.",
  "..OBWBBBbO",
  "..OBBBBBbO",
  "..OBBBBbbO",
  "...ObbbbO.",
  "....OOOO.."
];
const SHACKLE_ICON_PALETTE = {
  G: "#d1d5db", g: "#6b7280", O: "#0b0f19", B: "#4b5563", b: "#1f2937", W: "#f9fafb"
};

const BARS_ICON = [
  "FFFFFFFFFFF",
  "F.G.G.G.G.F",
  "F.G.G.G.G.F",
  "F.G.G.G.G.F",
  "FFFFFFFFFFF",
  "F.G.lll.G.F",
  "F.G.l.l.G.F",
  "F.GLLLLLG.F",
  "F.GLLKLLG.F",
  "F.GLLKLLG.F",
  "F.GLLLLLG.F",
  "FFFFFFFFFFF"
];
const BARS_ICON_PALETTE = {
  F: "#e5e7eb", G: "#9ca3af", L: "#facc15", l: "#a16207", K: "#111827"
};

/*
 * drawIcon(rows, palette, cx, cy, px): disegna un'icona in pixel art
 * centrata in (cx, cy), con pixel grandi "px".
 */
function drawIcon(rows, palette, cx, cy, px) {
  const left = Math.round(cx - (rows[0].length * px) / 2);
  const top = Math.round(cy - (rows.length * px) / 2);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const color = palette[rows[r][c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(left + c * px, top + r * px, px, px);
    }
  }
}

/*
 * drawPowerUpTile(t, rows, palette, rgb, hex): un power-up sulla mappa,
 * con alone pulsante del colore dato (rgb = "r, g, b", hex = "#rrggbb")
 * e l'icona che fluttua su e giù.
 */
function drawPowerUpTile(t, rows, palette, rgb, hex) {
  const cx = t.x * TILE + TILE / 2;
  const cy = t.y * TILE + TILE / 2;
  const pulse = 0.5 + 0.5 * Math.sin(now / 220);

  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE / 2);
  glow.addColorStop(0, `rgba(${rgb}, ${0.25 + 0.3 * pulse})`);
  glow.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(cx - TILE / 2, cy - TILE / 2, TILE, TILE);
  ctx.shadowColor = hex;
  ctx.shadowBlur = 6 + 6 * pulse;
  drawIcon(rows, palette, cx, cy + Math.round(Math.sin(now / 300) * 2), 2);
  ctx.restore();
}

/*
 * drawTimerHud(slot, rows, palette, timeLeft, duration, color): in alto a
 * destra della mappa un riquadro con l'icona del power-up attivo, i secondi
 * rimanenti e una barra che si accorcia. "slot" impila i riquadri quando
 * sono attivi più effetti insieme (0 = il primo in alto).
 * Negli ultimi 3 secondi il numero diventa rosso e lampeggia.
 */
function drawTimerHud(slot, rows, palette, timeLeft, duration, color) {
  const w = 92;
  const h = 42;
  const x = canvas.width - w - 8;
  const y = 8 + slot * (h + 6);
  const seconds = Math.ceil(timeLeft / 1000);
  const ending = seconds <= 3;
  const frame = ending ? "#f87171" : color;

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.shadowColor = frame;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  drawIcon(rows, palette, x + 20, y + 18, 2);

  if (!ending || blink(200)) {
    const text = String(seconds).padStart(2, "0");
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText(text, x + 44, y + 20);
    ctx.fillStyle = ending ? "#f87171" : "#ffffff";
    ctx.fillText(text, x + 42, y + 18);
  }

  // Barra del tempo rimanente
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(x + 6, y + h - 7, w - 12, 3);
  ctx.fillStyle = frame;
  ctx.fillRect(x + 6, y + h - 7, Math.round((w - 12) * timeLeft / duration), 3);
}

/*
 * drawPowerUpHud(): i riquadri dei power-up attivi, uno sotto l'altro.
 */
function drawPowerUpHud() {
  let slot = 0;
  if (shackleTimeLeft > 0) {
    drawTimerHud(slot++, SHACKLE_ICON, SHACKLE_ICON_PALETTE, shackleTimeLeft, SHACKLE_DURATION, "#fb923c");
  }
  if (barsTimeLeft > 0) {
    drawTimerHud(slot++, BARS_ICON, BARS_ICON_PALETTE, barsTimeLeft, BARS_DURATION, "#4ade80");
  }
}

/*
 * drawExitBars(e): l'uscita chiusa da un cancello di sbarre d'acciaio con
 * alone verde (come le celle) e un lucchetto. Le frecce rosse spariscono.
 * - All'attivazione le sbarre calano dall'alto come una saracinesca.
 * - Negli ultimi 3 secondi sfarfallano: stanno per riaprirsi.
 */
function drawExitBars(e) {
  const px = e.x * TILE;
  const py = e.y * TILE;
  const m = 4;                 // margine del cancello dal bordo della casella
  const inner = TILE - 2 * m;
  const drop = Math.min(1, (BARS_DURATION - barsTimeLeft) / 250);
  const h = Math.round(inner * drop);

  ctx.fillStyle = "rgba(127, 29, 29, 0.45)";
  ctx.fillRect(px, py, TILE, TILE);

  ctx.save();
  if (barsTimeLeft < 3000 && !blink(150)) ctx.globalAlpha = 0.35;

  // Trave in alto (da dove scendono le sbarre)
  ctx.fillStyle = "#4b5563";
  ctx.fillRect(px + m - 1, py + m - 2, inner + 2, 3);

  // Sbarre con riflesso
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 8;
  for (const off of [3, 11, 18, 26]) {
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(px + m + off, py + m, 3, h);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#e5e7eb";
  for (const off of [3, 11, 18, 26]) ctx.fillRect(px + m + off, py + m, 1, h);

  if (drop === 1) {
    // Traverse e trave a terra
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(px + m, py + m + 9, inner, 2);
    ctx.fillRect(px + m - 1, py + TILE - m - 1, inner + 2, 3);

    // Lucchetto al centro
    const cx = px + TILE / 2;
    const cy = py + TILE / 2 + 3;
    ctx.fillStyle = "#a16207";
    ctx.fillRect(cx - 3, cy - 5, 6, 1);
    ctx.fillRect(cx - 3, cy - 5, 1, 3);
    ctx.fillRect(cx + 2, cy - 5, 1, 3);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(cx - 4, cy - 2, 8, 6);
    ctx.fillStyle = "#111827";
    ctx.fillRect(cx - 1, cy, 2, 3);
  }
  ctx.restore();
}

/*
 * spawnPowerUpEffect(t, text, colors): quando Maigret raccoglie un power-up,
 * scintille nei colori dati e (se c'è) una scritta che sale, tenuta dentro
 * il canvas. Nel font pixel a 12px ogni lettera è larga 12px.
 */
function spawnPowerUpEffect(t, text, colors) {
  const cx = t.x * TILE + TILE / 2;
  const cy = t.y * TILE + TILE / 2;

  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.05 + Math.random() * 0.12;
    effects.push({
      type: "spark", x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 600, max: 600, color: colors[i % colors.length]
    });
  }
  if (!text) return;
  const half = text.length * 6 + 5;
  const tx = Math.min(Math.max(cx, half), canvas.width - half);
  effects.push({ type: "text", x: tx, y: cy - 12, vx: 0, vy: -0.035, life: 1200, max: 1200, text });
}

/*
 * drawSpriteScaled(cx, feetY, scale, opts): come drawSprite ma ingrandito
 * (per le schermate, dove i personaggi sono più grandi che in gioco).
 */
function drawSpriteScaled(cx, feetY, scale, opts) {
  ctx.save();
  ctx.translate(cx, feetY);
  ctx.scale(scale, scale);
  drawSprite(0, 0, opts);
  ctx.restore();
}

/*
 * drawCharacter(entity, sprite, palette, pipe, shackled): disegna un personaggio
 * del gioco nella sua posizione fluida (presa da getVisual).
 */
function drawCharacter(entity, sprite, palette, pipe = false, shackled = false) {
  const v = getVisual(entity);
  drawSprite(v.rx * TILE + TILE / 2, Math.round(v.ry * TILE + TILE - 2), {
    sprite, palette, pipe, shackled, dir: v.dir, walking: isWalking(v), walkTime: v.walkTime
  });
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
    e.vy += (e.g ?? 0) * dt; // leggera gravità (fuochi d'artificio)
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
 * fitFont(text, maxSize, maxWidth): sceglie una dimensione del font pixel che
 * faccia stare il testo nella larghezza data (di base il 90% del canvas, che
 * cambia da livello a livello). Nel font pixel ogni lettera è larga quanto
 * la dimensione del font.
 */
function fitFont(text, maxSize, maxWidth = canvas.width * 0.9) {
  const size = Math.max(6, Math.min(maxSize, Math.floor(maxWidth / text.length)));
  return `${size}px "Press Start 2P", monospace`;
}

/*
 * arcadeText(text, x, y, maxSize, color, opts): scrive un testo centrato nel
 * font pixel, con l'ombra squadrata tipica dei cabinati.
 * opts: maxWidth (larghezza massima), glow (alone luminoso), shadow (colore ombra).
 */
function arcadeText(text, x, y, maxSize, color, opts = {}) {
  ctx.font = fitFont(text, maxSize, opts.maxWidth);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (opts.shadow !== null) {
    ctx.fillStyle = opts.shadow ?? "#000000";
    ctx.fillText(text, x + 2, y + 2);
  }
  if (opts.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/*
 * blink(ms): true e false alternati ogni "ms" millisecondi, per le scritte
 * lampeggianti.
 */
function blink(ms = 500) {
  return Math.floor(now / ms) % 2 === 0;
}

/*
 * drawPanel(x, y, w, h, color): riquadro nero con doppio bordo al neon,
 * usato da tutte le schermate.
 */
function drawPanel(x, y, w, h, color) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
}

/*
 * veil(alpha): velo scuro sopra il gioco, sotto le schermate.
 */
function veil(alpha) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/*
 * Cuore in pixel art per mostrare le vite nelle schermate.
 */
const HEART = [".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."];

function drawHearts(cx, y, count) {
  const w = 7 * U + 6;
  const start = cx - (count * w) / 2;
  for (let i = 0; i < count; i++) {
    drawBitmap(HEART, start + i * w, y, { R: "#ef4444" }, false);
  }
}

/*
 * sepiaPalette(palette): trasforma una tavolozza in toni seppia, come
 * una foto di giornale (usata nella schermata di game over).
 */
function sepiaPalette(palette) {
  const out = {};
  for (const key in palette) {
    const hex = palette[key];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const l = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
    out[key] = `rgb(${Math.min(255, l + 30)}, ${Math.min(255, l + 15)}, ${l})`;
  }
  return out;
}

/*
 * drawBars(x, y, w, h): sbarre di una prigione al neon verde.
 */
function drawBars(x, y, w, h) {
  ctx.save();
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  for (let bx = x + 12; bx < x + w - 4; bx += 14) {
    ctx.moveTo(bx, y);
    ctx.lineTo(bx, y + h);
  }
  ctx.stroke();
  ctx.restore();
}

/*
 * ===================== SCHERMATA INIZIALE =====================
 * Una via di città di notte: cielo stellato, luna, palazzi con finestre
 * accese, lampioni e, sulla strada, Maigret che insegue un ladro col sacco.
 */
const BUILDINGS = [
  { w: 70, h: 0.20 }, { w: 48, h: 0.27 }, { w: 90, h: 0.16 }, { w: 60, h: 0.25 },
  { w: 76, h: 0.19 }, { w: 54, h: 0.28 }, { w: 84, h: 0.17 }, { w: 64, h: 0.23 },
  { w: 70, h: 0.26 }, { w: 58, h: 0.18 }
];

function drawTitleScreen() {
  const W = canvas.width;
  const H = canvas.height;
  const groundY = Math.round(H * 0.8);

  // Cielo
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#02030f");
  sky.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY);

  // Stelle che brillano (posizioni fisse, calcolate dall'indice)
  const rand = n => { const r = Math.sin(n * 12.9898) * 43758.5453; return r - Math.floor(r); };
  for (let i = 0; i < 70; i++) {
    const sx = Math.floor(rand(i + 1) * W);
    const sy = Math.floor(rand(i + 101) * H * 0.55);
    const a = 0.35 + 0.65 * Math.abs(Math.sin(now / 400 + i * 1.7));
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Luna
  ctx.save();
  ctx.shadowColor = "#fef3c7";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(W - 70, 70, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(W - 80, 60, 8, 8);
  ctx.fillRect(W - 62, 78, 6, 6);

  // Palazzi con finestre (alcune accese, una che si accende e spegne)
  let bx = 0;
  let b = 0;
  while (bx < W) {
    const bld = BUILDINGS[b % BUILDINGS.length];
    const bh = Math.round(H * bld.h);
    const top = groundY - bh;
    ctx.fillStyle = "#0b1026";
    ctx.fillRect(bx, top, bld.w - 4, bh);
    ctx.fillStyle = "#312e81";
    ctx.fillRect(bx, top, bld.w - 4, 3);

    for (let wy = top + 12; wy < groundY - 14; wy += 18) {
      for (let wx = bx + 8; wx < bx + bld.w - 14; wx += 14) {
        const seed = (wx * 7 + wy * 13 + b * 31) % 11;
        let lit = seed < 3;
        if (seed === 5) lit = Math.floor(now / 900 + b) % 3 === 0;
        ctx.fillStyle = lit ? "#fde68a" : "#1f2440";
        ctx.fillRect(wx, wy, 6, 9);
      }
    }
    bx += bld.w;
    b++;
  }

  // Strada, marciapiede e lampioni
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = "#374151";
  ctx.fillRect(0, groundY, W, 4);
  ctx.fillStyle = "#facc15";
  for (let lx = ((-now * 0.05) % 60) - 60; lx < W; lx += 60) {
    ctx.fillRect(Math.round(lx), H - 14, 30, 3);
  }
  for (let lx = 40; lx < W; lx += 200) {
    const glow = ctx.createRadialGradient(lx, groundY - 70, 2, lx, groundY - 40, 70);
    glow.addColorStop(0, "rgba(253, 224, 71, 0.45)");
    glow.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 70, groundY - 110, 140, 120);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(lx - 2, groundY - 70, 4, 70);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(lx - 7, groundY - 76, 14, 6);
  }

  // Inseguimento: il ladro scappa, Maigret lo segue a qualche passo
  const scale = 2;
  const feetY = Math.round(groundY + (H - groundY) * 0.55);
  const loopW = W + 260;
  const thiefX = ((now * 0.12) % loopW) - 60;
  const maigretX = thiefX - 110;
  drawSpriteScaled(maigretX, feetY, scale, {
    sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, dir: "right", walking: true, walkTime: now
  });
  drawSpriteScaled(thiefX, feetY, scale, {
    sprite: SPRITES.criminal, palette: criminalPalette(PERSONALITY_COLORS.temerario),
    dir: "right", walking: true, walkTime: now * 1.2, sack: true
  });
  if (Math.floor(now / 350) % 3 === 0) {
    arcadeText("!", thiefX + 4, feetY - SPRITE_ROWS * U * scale - 14, 16, "#fde047");
  }

  // Titolo e scritte
  arcadeText("GUARDIE", W / 2, H * 0.13, 44, "#fde047", { glow: true, shadow: "#9d174d" });
  arcadeText("E LADRI", W / 2, H * 0.24, 44, "#f0abfc", { glow: true, shadow: "#701a75" });
  arcadeText("UN CASO DEL COMMISSARIO MAIGRET", W / 2, H * 0.33, 11, "#93c5fd");
  if (blink(500)) arcadeText("INSERT COIN", W / 2, H * 0.43, 20, "#ffffff", { glow: true });
  arcadeText("PREMI INVIO PER GIOCARE", W / 2, H * 0.5, 10, "#fde047");

  // Legenda dei colori dei ladri
  const names = Object.keys(PERSONALITY_COLORS);
  const step = W / names.length;
  ctx.font = fitFont("IMPREVEDIBILE", 7, step - 18);
  ctx.textBaseline = "middle";
  names.forEach((name, i) => {
    const x = i * step + 10;
    ctx.fillStyle = PERSONALITY_COLORS[name];
    ctx.fillRect(x, H - 30, 8, 8);
    ctx.textAlign = "left";
    ctx.fillText(name.toUpperCase(), x + 12, H - 26);
  });
}

/*
 * ===================== PAUSA =====================
 * Il gioco resta visibile sotto un velo scuro; Maigret si fuma la pipa.
 */
function drawPauseScreen() {
  const W = canvas.width;
  const H = canvas.height;
  veil(0.65);

  const pw = Math.min(W - 40, 440);
  const ph = 220;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  drawPanel(px, py, pw, ph, "#22d3ee");

  arcadeText("PAUSA", W / 2, py + 40, 26, "#fde047", { glow: true });
  drawSpriteScaled(px + 60, py + 160, 2, { sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, dir: "down", pipe: true });

  const tx = px + 120 + (pw - 120) / 2;
  const tw = pw - 140;
  arcadeText("IL COMMISSARIO", tx, py + 95, 11, "#ffffff", { maxWidth: tw });
  arcadeText("SI CONCEDE", tx, py + 115, 11, "#ffffff", { maxWidth: tw });
  arcadeText("UNA PIPATA...", tx, py + 135, 11, "#ffffff", { maxWidth: tw });
  if (blink(600)) arcadeText("ESC PER RIPRENDERE", W / 2, py + ph - 26, 10, "#22d3ee", { maxWidth: pw - 30 });
}

/*
 * ===================== LIVELLO COMPLETATO =====================
 * "CASO RISOLTO!": tutti i ladri del livello dietro le sbarre e Maigret
 * accanto alla cella che fuma soddisfatto.
 */
function drawLevelCompleteScreen() {
  const W = canvas.width;
  const H = canvas.height;
  veil(0.7);

  // Cella con tutti i ladri del livello: su due file se sono tanti
  const n = game.criminals.length;
  const pw = Math.min(W - 30, 560);
  const perRow = n > 5 ? Math.ceil(n / 2) : n;
  const rowsCount = Math.ceil(n / perRow);
  const scale = Math.min(1.5, (pw - 150) / (perRow * 34));
  const slot = 34 * scale;
  const rowH = SPRITE_ROWS * U * scale + 10;
  const jailW = perRow * slot + 20;
  const jailH = rowsCount * rowH + 14;
  const ph = 75 + jailH + 105;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  const jailX = px + (pw - 90 - jailW) / 2;
  const jailY = py + 75;
  drawPanel(px, py, pw, ph, "#4ade80");

  arcadeText("CASO RISOLTO!", W / 2, py + 40, 26, "#fde047", { glow: true, shadow: "#14532d", maxWidth: pw - 30 });

  ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
  ctx.fillRect(jailX, jailY, jailW, jailH);
  game.criminals.forEach((c, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    drawSpriteScaled(jailX + 10 + slot * (col + 0.5), jailY + 6 + rowH * (row + 1) - 4, scale, {
      sprite: SPRITES.criminal, palette: criminalPalette(c.color), dir: "down"
    });
  });
  drawBars(jailX, jailY, jailW, jailH);

  // Maigret accanto alla cella
  drawSpriteScaled(jailX + jailW + 45, jailY + jailH - 6, Math.max(scale, 1.5), {
    sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, dir: "left", pipe: true
  });

  arcadeText(`ARRESTI: ${game.caught}   PUNTEGGIO: ${game.score}`, W / 2, jailY + jailH + 35, 11, "#ffffff", { maxWidth: pw - 40 });
  if (blink()) arcadeText("INVIO: PROSSIMO CASO", W / 2, jailY + jailH + 72, 12, "#4ade80", { maxWidth: pw - 40 });
}

/*
 * ===================== LIVELLO PERSO =====================
 * "IL LADRO E' SCAPPATO!" (il font pixel non ha la È maiuscola): volantino "RICERCATO" con la faccia del fuggitivo,
 * il ladro che corre via col sacco e Maigret che resta a guardare.
 */
function drawLevelLostScreen() {
  const W = canvas.width;
  const H = canvas.height;
  veil(0.7);

  const pw = Math.min(W - 30, 560);
  const ph = 320;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  drawPanel(px, py, pw, ph, "#f87171");

  arcadeText("IL LADRO E' SCAPPATO!", W / 2, py + 40, 22, "#f87171", { glow: true, shadow: "#450a0a", maxWidth: pw - 30 });

  const thiefPalette = criminalPalette(escapedCriminal?.color ?? PERSONALITY_COLORS.furbo);

  // Volantino "RICERCATO" un po' storto
  const postX = px + 28;
  const postY = py + 75;
  ctx.save();
  ctx.translate(postX + 55, postY + 70);
  ctx.rotate(-0.05);
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(-55, -70, 110, 140);
  ctx.fillStyle = "#78350f";
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RICERCATO", 0, -56);
  ctx.fillStyle = "#d6b97a";
  ctx.fillRect(-40, -44, 80, 74);
  ctx.beginPath();
  ctx.rect(-40, -44, 80, 74);
  ctx.clip();
  drawSpriteScaled(0, 80, 3.2, { sprite: SPRITES.criminal, palette: thiefPalette, dir: "down" });
  ctx.restore();
  ctx.fillStyle = "#78350f";
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = "center";
  ctx.fillText("TAGLIA: 100", postX + 55, postY + 125);

  // Scena: Maigret fermo, il ladro corre via
  const sceneX = px + 160;
  const sceneW = pw - 180;
  const groundY = py + 205;
  ctx.fillStyle = "#374151";
  ctx.fillRect(sceneX, groundY, sceneW, 3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sceneX, py + 70, sceneW, groundY - py - 60);
  ctx.clip();
  drawSpriteScaled(sceneX + 30, groundY, 2, { sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, dir: "right" });
  const runX = sceneX + 90 + ((now * 0.1) % (sceneW - 30));
  drawSpriteScaled(runX, groundY, 2, {
    sprite: SPRITES.criminal, palette: thiefPalette, dir: "right", walking: true, walkTime: now * 1.2, sack: true
  });
  ctx.restore();
  if (blink(300)) arcadeText("?!", sceneX + 30, groundY - SPRITE_ROWS * U * 2 - 14, 12, "#fde047");

  arcadeText("VITE RIMASTE", W / 2, py + 235, 9, "#ffffff");
  drawHearts(W / 2, py + 248, game.lives);
  if (blink()) arcadeText("INVIO: RIPROVA", W / 2, py + ph - 26, 12, "#f87171", { maxWidth: pw - 40 });
}

/*
 * ===================== GAME OVER =====================
 * Prima pagina di giornale ingiallita: i ladri l'hanno fatta franca,
 * con la foto seppia del fuggitivo e il timbro "CASO ARCHIVIATO".
 */
function drawGameOverScreen() {
  const W = canvas.width;
  const H = canvas.height;
  veil(0.82);

  if (blink(700)) {
    arcadeText("GAME OVER", W / 2, H * 0.1, 34, "#ef4444", { glow: true, shadow: "#450a0a" });
  }

  // Giornale
  const nw = Math.min(W - 50, 460);
  const nh = Math.min(H * 0.6, 330);
  const nx = (W - nw) / 2;
  const ny = H * 0.18;
  ctx.fillStyle = "#f1e6c8";
  ctx.fillRect(nx, ny, nw, nh);
  ctx.strokeStyle = "#a8a29e";
  ctx.lineWidth = 2;
  ctx.strokeRect(nx + 6, ny + 6, nw - 12, nh - 12);

  arcadeText("LA GAZZETTA", nx + nw / 2, ny + 32, 20, "#1c1917", { shadow: null, maxWidth: nw - 30 });
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(nx + 14, ny + 50, nw - 28, 3);
  ctx.fillRect(nx + 14, ny + 56, nw - 28, 1);
  arcadeText("EDIZIONE STRAORDINARIA", nx + nw / 2, ny + 68, 7, "#57534e", { shadow: null });
  arcadeText("I LADRI LA", nx + nw / 2, ny + 95, 16, "#1c1917", { shadow: null, maxWidth: nw - 30 });
  arcadeText("FANNO FRANCA!", nx + nw / 2, ny + 120, 16, "#1c1917", { shadow: null, maxWidth: nw - 30 });

  // Foto seppia del fuggitivo
  const photoX = nx + 20;
  const photoY = ny + 140;
  const photoW = 120;
  const photoH = Math.max(60, nh - 160);
  ctx.fillStyle = "#cbbd99";
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.strokeStyle = "#57534e";
  ctx.strokeRect(photoX, photoY, photoW, photoH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, photoY, photoW, photoH);
  ctx.clip();
  drawSpriteScaled(photoX + photoW / 2, photoY + photoH - 6, 2, {
    sprite: SPRITES.criminal,
    palette: sepiaPalette(criminalPalette(escapedCriminal?.color ?? PERSONALITY_COLORS.furbo)),
    dir: "right", walking: true, walkTime: 110, sack: true
  });
  ctx.restore();

  // Colonne di testo finte
  ctx.fillStyle = "#a8a29e";
  for (let ly = photoY + 4, i = 0; ly < photoY + photoH - 4; ly += 10, i++) {
    const lw = (nw - photoW - 60) * (0.6 + ((i * 37) % 40) / 100);
    ctx.fillRect(photoX + photoW + 16, ly, lw, 4);
  }

  // Timbro rosso
  ctx.save();
  ctx.translate(nx + nw * 0.66, photoY + photoH / 2);
  ctx.rotate(-0.22);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 3;
  ctx.strokeRect(-92, -20, 184, 40);
  ctx.strokeRect(-87, -15, 174, 30);
  ctx.fillStyle = "#dc2626";
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CASO ARCHIVIATO", 0, 1);
  ctx.restore();

  arcadeText(`PUNTEGGIO FINALE: ${game.score}`, W / 2, ny + nh + 28, 12, "#fde047");
  if (blink()) arcadeText("INVIO: TORNA AL MENU", W / 2, ny + nh + 56, 11, "#ffffff");
}

/*
 * ===================== GIOCO COMPLETATO =====================
 * Fuochi d'artificio e Maigret che saluta alzando il cappello.
 */
const FIREWORK_COLORS = ["#facc15", "#fb923c", "#e879f9", "#f87171", "#22d3ee", "#4ade80"];

function spawnFirework() {
  const x = canvas.width * (0.1 + Math.random() * 0.8);
  const y = canvas.height * (0.08 + Math.random() * 0.35);
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const s = 0.08 + Math.random() * 0.1;
    effects.push({
      type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.00012,
      life: 1100, max: 1100, color
    });
  }
}

function drawWinScreen() {
  const W = canvas.width;
  const H = canvas.height;
  veil(0.8);
  drawEffects();

  arcadeText("TUTTI DIETRO", W / 2, H * 0.18, 30, "#fde047", { glow: true, shadow: "#9d174d" });
  arcadeText("LE SBARRE!", W / 2, H * 0.27, 30, "#fde047", { glow: true, shadow: "#9d174d" });
  arcadeText("CONGRATULAZIONI, COMMISSARIO!", W / 2, H * 0.36, 11, "#93c5fd");

  drawSpriteScaled(W / 2, H * 0.66, 3, { sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, dir: "down", hatUp: true });

  arcadeText(`PUNTEGGIO FINALE: ${game.score}`, W / 2, H * 0.77, 14, "#ffffff");
  if (blink()) arcadeText("INVIO: TORNA AL MENU", W / 2, H * 0.86, 11, "#4ade80");
}

/*
 * isGameWon(): true quando l'ultimo livello è stato completato.
 */
function isGameWon() {
  return game.gameOver && !levelComplete && !levelLost && !gameLost &&
    game.caught === game.criminals.length;
}

/*
 * draw(): ridisegna l'intera scena da zero.
 * - Sulla schermata iniziale disegna solo il menu.
 * - In gioco: sfondo del livello, uscite lampeggianti, personaggi (ordinati
 *   dall'alto in basso così chi sta più in basso copre chi sta dietro),
 *   effetti delle catture e, sopra, la schermata di pausa o di fine.
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (screen === "title") {
    drawTitleScreen();
    return;
  }

  if (background) ctx.drawImage(background, 0, 0);

  for (const e of game.exits) {
    if (barsTimeLeft > 0) drawExitBars(e);
    else drawExit(e);
  }
  for (const t of shackleTiles) {
    if (t.available) drawPowerUpTile(t, SHACKLE_ICON, SHACKLE_ICON_PALETTE, "251, 146, 60", "#fb923c");
  }
  for (const t of barsTiles) {
    if (t.available) drawPowerUpTile(t, BARS_ICON, BARS_ICON_PALETTE, "74, 222, 128", "#4ade80");
  }

  // Personaggi, ordinati per riga disegnata
  const shackled = shackleTimeLeft > 0;
  const actors = game.criminals
    .filter(c => !c.arrested)
    .map(c => ({ entity: c, sprite: SPRITES.criminal, palette: criminalPalette(c.color), pipe: false, shackled }));
  actors.push({ entity: game.player, sprite: SPRITES.maigret, palette: MAIGRET_PALETTE, pipe: true, shackled: false });
  actors.sort((a, b) => getVisual(a.entity).ry - getVisual(b.entity).ry);
  for (const a of actors) drawCharacter(a.entity, a.sprite, a.palette, a.pipe, a.shackled);

  drawEffects();
  drawPowerUpHud();

  if (game.gameOver) {
    if (gameLost) drawGameOverScreen();
    else if (levelLost) drawLevelLostScreen();
    else if (levelComplete) drawLevelCompleteScreen();
    else if (isGameWon()) drawWinScreen();
  } else if (paused) {
    drawPauseScreen();
  }

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}



/*
 * loop(time): il ciclo di gioco, chiamato dal browser circa 60 volte al secondo
 * tramite requestAnimationFrame; "time" è il tempo trascorso in millisecondi.
 * - Solo durante una partita non in pausa:
 *   - Giocatore: al massimo un passo ogni playerDelay ms. Sceglie UNA sola
 *     direzione (niente diagonali): l'ultimo tasto premuto, oppure un altro tasto
 *     tenuto premuto se lì c'è un muro; muove Maigret e memorizza l'istante del passo.
 *   - Power-up: scorrono i countdown di palla al piede e sbarre.
 *   - Criminali: si muovono tutti insieme ogni criminalDelay ms (il doppio
 *     mentre hanno la palla al piede).
 *   - Grafica: fa scorrere le posizioni disegnate verso quelle vere.
 * - Aggiorna gli effetti (fermi in pausa), lancia i fuochi d'artificio a
 *   gioco completato, ridisegna e si ri-prenota per il fotogramma successivo.
 */
function loop(time) {
  const dt = lastFrame ? Math.min(time - lastFrame, 100) : 16;
  lastFrame = time;
  now = time;

  const active = screen === "playing" && !paused;

  if (active && !game.gameOver && time - lastPlayerMove > playerDelay) {
    // l'ultimo tasto premuto ha la precedenza; se lì c'è un muro si prova
    // l'altro tenuto premuto. Se sono tutti bloccati Maigret si gira soltanto.
    let dx = 0, dy = 0;
    for (let i = dirKeys.length - 1; i >= 0; i--) {
      const [ddx, ddy] = DIRS[dirKeys[i]];
      if (!wall(game, game.player.x + ddx, game.player.y + ddy)) {
        [dx, dy] = [ddx, ddy];
        break;
      }
    }
    if (!dx && !dy && dirKeys.length) [dx, dy] = DIRS[dirKeys[dirKeys.length - 1]];

    if (dx || dy) {
      // Maigret si gira verso la direzione premuta anche se davanti c'è un muro
      getVisual(game.player).dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
      movePlayer(dx, dy);
      lastPlayerMove = time;
    }
  }

  if (active && !game.gameOver) {
    updateShackle(dt);
    updateBars(dt);
  }

  if (active && !game.gameOver && time - lastEnemyMove > currentCriminalDelay()) {
    moveCriminals(game);
    lastEnemyMove = time;
  }

  if (active) {
    updateVisual(game.player, playerDelay, dt);
    for (const c of game.criminals) updateVisual(c, currentCriminalDelay(), dt);
  }
  if (!paused) updateEffects(dt);
  if (screen === "playing" && isGameWon() && Math.random() < dt / 350) spawnFirework();

  draw();
  requestAnimationFrame(loop);
}

/*
 * Avvio: mostra la schermata iniziale e fa partire il ciclo di gioco.
 */
showTitle();
requestAnimationFrame(loop);
