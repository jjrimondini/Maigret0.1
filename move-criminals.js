// Movimento dei criminali: una funzione dedicata per ogni personalità.
/*
 * Import delle funzioni di supporto da criminal-utils.js:
 * - chooseCellTarget: sceglie la cella di un compagno arrestato da raggiungere
 * - evadeMaigret: fa un passo allontanandosi da Maigret e verso un target
 * - findPath: percorso più breve tra due caselle
 * - findSafePath: percorso che preferisce stare lontano da Maigret
 * - wall: dice se una casella è un muro o fuori mappa
 */
import { chooseCellTarget, evadeMaigret, findPath, findSafePath, wall } from "./criminal-utils.js";

// Funzioni condivise internamente al modulo.
/*
 * getNeighbors(game, criminal)
 * Restituisce le caselle adiacenti al criminale (destra, sinistra, giù, su)
 * in cui potrebbe spostarsi: scarta i muri e le caselle occupate da altri
 * criminali liberi. NON scarta la casella di Maigret: lo fanno, se serve,
 * le funzioni che la usano.
 */
function getNeighbors(game, criminal) {
  return [
    { x: criminal.x + 1, y: criminal.y },
    { x: criminal.x - 1, y: criminal.y },
    { x: criminal.x, y: criminal.y + 1 },
    { x: criminal.x, y: criminal.y - 1 }
  ].filter(p =>
    !wall(game, p.x, p.y) &&
    !game.criminals.some(other =>
      other !== criminal && !other.arrested &&
      other.x === p.x && other.y === p.y
    )
  );
}

/*
 * canMoveTo(game, criminal, p)
 * Dice se il criminale può entrare nella casella p: true se non è un muro
 * e non è occupata da un altro criminale libero.
 * È lo stesso controllo di getNeighbors, ma su una sola casella.
 */
function canMoveTo(game, criminal, p) {
  return !wall(game, p.x, p.y) &&
    !game.criminals.some(other =>
      other !== criminal && !other.arrested &&
      other.x === p.x && other.y === p.y
    );
}

/*
 * Raggio di fuga di ogni personalità: da quanti passi di distanza
 * il criminale "punta" all'uscita. Più è alto, più fuggire è una priorità.
 */
const ESCAPE_RANGE = {
  fifone: Infinity,
  furbo: 10,
  imprevedibile: 6,
  temerario: 3
};

/*
 * getEscapePath(game, criminal)
 * Restituisce il percorso sicuro verso l'uscita più vicina, ma solo se
 * è entro il raggio di fuga del criminale;
 * Il raggio scritto nel livello (escapeRange) ha la precedenza su quello
 * della personalità.
 */
function getEscapePath(game, criminal) {
  const range = criminal.escapeRange ?? ESCAPE_RANGE[criminal.personality] ?? 0;

  let best = [];
  for (const exit of game.exits) {
    const path = findSafePath(game, criminal, exit, criminal);
    if (path.length && (!best.length || path.length < best.length)) {
      best = path;
    }
  }

  return best.length <= range ? best : [];
}

/*
 * tryEscape(game, criminal)
 * Fa un passo verso l'uscita, se il criminale è entro il raggio di fuga
 * Restituisce true se si è mosso.
 */
function tryEscape(game, criminal) {
  const path = getEscapePath(game, criminal)
  if (!path.length) return false;

  const next = path[0];
  if (!canMoveTo(game, criminal, next)) return false;

  criminal.x = next.x;
  criminal.y = next.y;
  return true;
}

/*
 * moveRandomly(game, criminal)
 * Sposta il criminale in una casella adiacente scelta a caso, tra quelle
 * libere e diverse dalla casella di Maigret (non gli finisce mai addosso).
 * Se non c'è nessuna casella disponibile, resta fermo.
 */
function moveRandomly(game, criminal) {
  const options = getNeighbors(game, criminal).filter(p =>
    canMoveTo(game, criminal, p) &&
    (p.x !== game.player.x || p.y !== game.player.y)
  );
  if (!options.length) return;

  const next = options[Math.floor(Math.random() * options.length)];
  criminal.x = next.x;
  criminal.y = next.y;
}

/*
 * fleeFromMaigret(game, criminal)
 * Fuga pura: tra le caselle adiacenti libere (esclusa quella di Maigret)
 * sceglie quella da cui la strada per raggiungere Maigret è più lunga,
 * calcolata con findPath (quindi tenendo conto dei muri, non in linea d'aria).
 * Se più caselle sono ugualmente lontane, ne sceglie una a caso.
 * Se non c'è nessuna casella disponibile, resta fermo.
 */
function fleeFromMaigret(game, criminal) {
  const options = getNeighbors(game, criminal).filter(p =>
    canMoveTo(game, criminal, p) &&
    (p.x !== game.player.x || p.y !== game.player.y)
  );
  if (!options.length) return;

  const choices = options.map(p => ({
    ...p,
    distance: findPath(game, p, game.player).length
  }));
  const maxDistance = Math.max(...choices.map(p => p.distance));
  const best = choices.filter(p => p.distance === maxDistance);
  const next = best[Math.floor(Math.random() * best.length)];
  criminal.x = next.x;
  criminal.y = next.y;
}

/*
 * handleDanger(game, criminal)
 * Gestisce il "pericolo": controlla quanto Maigret è vicino (caselle in
 * orizzontale + in verticale, ignorando i muri).
 * - Se è a più di 5 caselle non c'è pericolo: restituisce false e il
 *   criminale proseguirà col suo comportamento normale.
 * - Altrimenti prova a scappare con evadeMaigret (che cerca anche di
 *   avvicinarsi al target del criminale); se quella non trova mosse, ripiega
 *   su fleeFromMaigret. Poi controlla una possibile cattura e restituisce
 *   true, così il chiamante sa che il turno del criminale è già stato usato.
 */
function handleDanger(game, criminal) {
  const distance = Math.abs(criminal.x - game.player.x) +
    Math.abs(criminal.y - game.player.y);

  if (distance > 5) return false;

  const escapePath = getEscapePath(game, criminal);
  const goal = escapePath.length ? escapePath[escapePath.length - 1] : criminal.target;

if (!evadeMaigret(game, criminal, goal)) {
    fleeFromMaigret(game, criminal);
  }
  game.checkCapture();
  return true;
}

/*
 * updateFreedPrisonersStatus(game)
 * Da chiamare quando un prigioniero viene liberato: ricalcola il numero di
 * arresti contando i criminali ancora in cella e aggiorna la riga di stato
 * sotto il gioco con i criminali liberi e il punteggio (che non cambia).
 */
function updateFreedPrisonersStatus(game) {
  game.caught = game.criminals.filter(c => c.arrested).length;
  game.statusText.textContent =
    `Criminali liberi: ${game.criminals.length - game.caught}/${game.criminals.length} | Punteggio: ${game.score}`;
}

/*
 * tryFreePrisoner(game, criminal)
 * Fa fare al criminale un passo verso la cella di un compagno arrestato e,
 * se ci arriva, lo libera. Restituisce true se il criminale si è mosso,
 * false se per qualche motivo è rimasto fermo.
 * Passi:
 * 1. Se non ci sono compagni arrestati, non fa nulla (false).
 * 2. Se il target attuale non è più la cella di un prigioniero (o non c'è),
 *    ne sceglie uno nuovo con chooseCellTarget; se non lo trova, false.
 * 3. Calcola una strada "sicura" con findSafePath; se non esiste, cancella
 *    il target e restituisce false.
 * 4. Guarda il primo passo della strada:
 *    - se coincide con la casella di Maigret, il criminale "furbo" cerca una
 *      deviazione (la casella vicina libera da cui il target è più vicino),
 *      gli altri invece rinunciano per questo turno;
 *    - altrimenti, se la casella è libera, ci si sposta.
 * 5. Se dopo il passo il criminale si trova sulla cella del prigioniero,
 *    lo libera: il prigioniero torna libero nella sua cella, entrambi
 *    perdono il target e si aggiorna la riga di stato.
 */
function tryFreePrisoner(game, criminal) {
  const prisoners = game.criminals.filter(other => other.arrested && other !== criminal);
  if (!prisoners.length) return false;

  const targetStillOccupied = criminal.target && prisoners.some(other =>
    other.home.x === criminal.target.x && other.home.y === criminal.target.y
  );
  if (!targetStillOccupied) chooseCellTarget(game, criminal);
  if (!criminal.target) return false;

  const path = findSafePath(game, criminal, criminal.target, criminal);
  if (!path.length) {
    criminal.target = null;
    return false;
  }

  const next = path[0];

  if (next.x === game.player.x && next.y === game.player.y) {
    // Il furbo cerca una deviazione; gli altri aspettano il turno successivo.
    if (criminal.personality !== "furbo") return false;

    const alternatives = getNeighbors(game, criminal).filter(p =>
      canMoveTo(game, criminal, p) &&
      (p.x !== game.player.x || p.y !== game.player.y) &&
      findPath(game, p, criminal.target).length > 0
    );
    if (!alternatives.length) return false;

    alternatives.sort((a, b) =>
      findPath(game, a, criminal.target).length -
      findPath(game, b, criminal.target).length
    );
    criminal.x = alternatives[0].x;
    criminal.y = alternatives[0].y;
  } else {
    if (!canMoveTo(game, criminal, next)) return false;
    criminal.x = next.x;
    criminal.y = next.y;
  }

  const prisoner = game.criminals.find(other =>
    other.arrested &&
    other.home.x === criminal.target.x &&
    other.home.y === criminal.target.y
  );

  if (prisoner && criminal.x === prisoner.home.x && criminal.y === prisoner.home.y) {
    prisoner.arrested = false;
    prisoner.x = prisoner.home.x;
    prisoner.y = prisoner.home.y;
    prisoner.target = null;
    criminal.target = null;
    updateFreedPrisonersStatus(game);
  }

  return true;
}

// 1. FIFONE: tende a scappare e non cerca di liberare i compagni.
/*
 * moveFifone(game, criminal)
 * Se Maigret è vicino lascia fare a handleDanger. Altrimenti scappa comunque
 * con fleeFromMaigret, anche quando Maigret è lontano. Infine controlla
 * se c'è stata una cattura.
 */
export function moveFifone(game, criminal) {
  if (handleDanger(game, criminal)) return;
  if (tryEscape(game, criminal)) {
  game.checkCapture();
  return;
}
  fleeFromMaigret(game, criminal);
  game.checkCapture();
}

// 2. FURBO: cerca di liberare un compagno, scegliendo il percorso più breve.
// Se non ci sono prigionieri, scappa.
/*
 * moveFurbo(game, criminal)
 * Se Maigret è vicino lascia fare a handleDanger. Altrimenti:
 * - se nessun compagno è in cella, scappa con fleeFromMaigret;
 * - se c'è almeno un prigioniero, prova a liberarlo con tryFreePrisoner
 *   (dove, essendo "furbo", sceglie la cella più vicina e sa aggirare Maigret).
 * In entrambi i casi controlla poi se c'è stata una cattura.
 */
export function moveFurbo(game, criminal) {
  if (handleDanger(game, criminal)) return;
  if (tryEscape(game, criminal)) {
  game.checkCapture();
  return;
}

  const prisoners = game.criminals.filter(other => other.arrested && other !== criminal);
  if (!prisoners.length) {
    fleeFromMaigret(game, criminal);
    game.checkCapture();
    return;
  }

  tryFreePrisoner(game, criminal);
  game.checkCapture();
}

// 3. IMPREVEDIBILE: talvolta si muove a caso; altrimenti prova a liberare
// un compagno. Se non ci sono prigionieri, fugge.
/*
 * moveImprevedibile(game, criminal)
 * Se Maigret è vicino lascia fare a handleDanger. Altrimenti:
 * - nel 40% dei casi (Math.random() < 0.4) fa un passo a caso;
 * - nel restante 60% si comporta come gli altri: se nessun compagno è in
 *   cella scappa, altrimenti prova a liberarne uno (cella scelta a caso).
 * Dopo ogni mossa controlla se c'è stata una cattura.
 */
export function moveImprevedibile(game, criminal) {
  if (handleDanger(game, criminal)) return;
  if (tryEscape(game, criminal)) {
  game.checkCapture();
  return;
}

  if (Math.random() < 0.4) {
    moveRandomly(game, criminal);
    game.checkCapture();
    return;
  }

  const prisoners = game.criminals.filter(other => other.arrested && other !== criminal);
  if (!prisoners.length) {
    fleeFromMaigret(game, criminal);
    game.checkCapture();
    return;
  }

  tryFreePrisoner(game, criminal);
  game.checkCapture();
}

// 4. TEMERARIO: prova a liberare i compagni senza la scelta del bersaglio
// più vicino riservata al furbo. Se non ci sono prigionieri, scappa.
/*
 * moveTemerario(game, criminal)
 * Stessa struttura di moveFurbo: se Maigret è vicino lascia fare a
 * handleDanger, se nessun compagno è in cella scappa, altrimenti prova a
 * liberarne uno con tryFreePrisoner. La differenza sta tutta dentro
 * tryFreePrisoner: il temerario sceglie la cella a caso e, se Maigret gli
 * sbarra la strada, aspetta invece di cercare una deviazione.
 * Infine controlla se c'è stata una cattura.
 */
export function moveTemerario(game, criminal) {
  if (handleDanger(game, criminal)) return;
  if (tryEscape(game, criminal)) {
  game.checkCapture();
  return;
}

  const prisoners = game.criminals.filter(other => other.arrested && other !== criminal);
  if (!prisoners.length) {
    fleeFromMaigret(game, criminal);
    game.checkCapture();
    return;
  }

  tryFreePrisoner(game, criminal);
  game.checkCapture();
}

// Punto d'ingresso chiamato da main.js: smista ogni criminale alla sua funzione.
/*
 * moveCriminals(game)
 * Chiamata da main.js ogni 300 ms. Scorre tutti i criminali, salta quelli
 * arrestati e, in base alla personalità, chiama la funzione di movimento
 * corrispondente. Se la personalità non è riconosciuta, il criminale
 * semplicemente scappa da Maigret e si controlla una possibile cattura.
 */
export function moveCriminals(game) {
  for (const criminal of game.criminals) {
    if (criminal.arrested) continue;

    switch (criminal.personality) {
      case "fifone":
        moveFifone(game, criminal);
        break;
      case "furbo":
        moveFurbo(game, criminal);
        break;
      case "imprevedibile":
        moveImprevedibile(game, criminal);
        break;
      case "temerario":
        moveTemerario(game, criminal);
        break;
      default:
        // Comportamento prudente se viene aggiunta una personalità sconosciuta.
        fleeFromMaigret(game, criminal);
        game.checkCapture();
    }
    game.checkEscape(criminal);
    if (game.gameOver) return;
   }
}
