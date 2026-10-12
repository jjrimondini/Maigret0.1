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
  COLS:0, ROWS:0, map, TILE, canvas, ctx, statusText,
  player: null, criminals: [],exit: [], score: 0, caught: 0, gameOver: false,
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
    levelLost=false

    document.getElementById("level-info").textContent = level.name;

    statusText.textContent =
        `Criminali in libertà: ${game.criminals.length - game.caught} | Punteggio: ${game.score}`;

    lastPlayerMove = 0;
    lastEnemyMove = 0;

    draw();
}

/*
  * restart(): riavvia la partita, azzerando il punteggio e caricando il primo livello.
  */

function restart() {
    game.score = 0;
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
    levelLost = true;
    statusText.textContent =
        `Un criminale è fuggito! | Punteggio: ${game.score} | Premi INVIO per riprovare`;
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
});
document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
document.getElementById("restart").addEventListener("click", restart);

/*
 * drawCharacter(x, y, emoji, color): disegna un personaggio nella casella (x, y).
 * Converte le coordinate di griglia nel centro della casella in pixel,
 * disegna un cerchio colorato di raggio 15 e ci scrive sopra l'emoji, centrata.
 */
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

/*
 * draw(): ridisegna l'intera scena da zero, in quattro passi.
 * 1. Cancella il canvas.
 * 2. Disegna la mappa casella per casella: i muri "#" come blocchi blu con un
 *    bordino interno; tutto il resto come pavimento scuro; le celle "C" hanno
 *    in più un quadrato verde chiaro con il simbolo "▤" (le sbarre).
 * 3. Disegna i criminali non ancora arrestati (🏃 col loro colore) e poi
 *    Maigret (🕵️ su cerchio azzurro), così il giocatore resta sempre sopra.
 * 4. Se la partita è finita, sovrappone un riquadro semitrasparente al centro
 *    con la scritta "CASO RISOLTO!" e un messaggio di congratulazioni.
 */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Disegna la mappa del livello attivo
  for (let y = 0; y < game.ROWS; y++) {
    for (let x = 0; x < game.COLS; x++) {
      const px = x * TILE;
      const py = y * TILE;

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
        if (map[y][x] === "E") {
          ctx.fillStyle = "#111d30";
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }

  // Disegna i criminali ancora in libertà
  for (const c of game.criminals) {
    if (!c.arrested) {
      drawCharacter(c.x, c.y, "🏃", c.color);
    }
  }

  // Disegna Maigret
  drawCharacter(game.player.x, game.player.y, "🕵️", "#60a5fa");

  // Schermata di fine partita o completamento livello
   if (game.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let message = "PARTITA TERMINATA";
    let subtitle = "Premi Riavvia per ricominciare";
  if (levelLost) {
   message = "UN CRIMINALE È FUGGITO!";
   subtitle = "Premi INVIO per riprovare il livello";
   }
 else if (levelComplete)  { 
      message = "LIVELLO COMPLETATO!";
      subtitle = "Premi INVIO per il livello successivo";
    } else if (
      currentLevelIndex === levels.length - 1 &&
      game.caught === game.criminals.length
    ) {
      message = "GIOCO COMPLETATO!";
      subtitle = "Hai catturato tutti i criminali!";
    }

    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px Arial";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 24);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}



/*
 * loop(time): il ciclo di gioco, chiamato dal browser circa 60 volte al secondo
 * tramite requestAnimationFrame; "time" è il tempo trascorso in millisecondi.
 * - Giocatore: al massimo un passo ogni 125 ms. Legge i tasti premuti e sceglie
 *   UNA sola direzione (priorità: su, giù, sinistra, destra — niente diagonali);
 *   se c'è una direzione, muove Maigret e memorizza l'istante del passo.
 * - Criminali: si muovono tutti insieme ogni 300 ms (più lenti di Maigret,
 *   altrimenti sarebbe impossibile prenderli).
 * - Infine ridisegna la scena e si ri-prenota per il fotogramma successivo.
 */
function loop(time) {
  if (!game.gameOver && time - lastPlayerMove > playerDelay) {
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

  if (!game.gameOver && time - lastEnemyMove > criminalDelay) {
    moveCriminals(game);
    lastEnemyMove = time;
  }

  draw();
  requestAnimationFrame(loop);
}

/*
 * Avvio: prepara la prima partita e fa partire il ciclo di gioco.
 */
restart();
requestAnimationFrame(loop);
