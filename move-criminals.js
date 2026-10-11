// Movimento dei criminali: una funzione dedicata per ogni personalità.
import { chooseCellTarget, evadeMaigret, findPath, findSafePath, wall } from "./criminal-utils.js";

// Funzioni condivise internamente al modulo.
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

function canMoveTo(game, criminal, p) {
  return !wall(game, p.x, p.y) &&
    !game.criminals.some(other =>
      other !== criminal && !other.arrested &&
      other.x === p.x && other.y === p.y
    );
}

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

function handleDanger(game, criminal) {
  const distance = Math.abs(criminal.x - game.player.x) +
    Math.abs(criminal.y - game.player.y);

  if (distance > 5) return false;

  if (!evadeMaigret(game, criminal, criminal.target)) {
    fleeFromMaigret(game, criminal);
  }
  game.checkCapture();
  return true;
}

function updateFreedPrisonersStatus(game) {
  game.caught = game.criminals.filter(c => c.arrested).length;
  game.statusText.textContent =
    `Criminali liberi: ${game.criminals.length - game.caught}/4 | Punteggio: ${game.score}`;
}

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
export function moveFifone(game, criminal) {
  if (handleDanger(game, criminal)) return;
  fleeFromMaigret(game, criminal);
  game.checkCapture();
}

// 2. FURBO: cerca di liberare un compagno, scegliendo il percorso più breve.
// Se non ci sono prigionieri, scappa.
export function moveFurbo(game, criminal) {
  if (handleDanger(game, criminal)) return;

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
export function moveImprevedibile(game, criminal) {
  if (handleDanger(game, criminal)) return;

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
export function moveTemerario(game, criminal) {
  if (handleDanger(game, criminal)) return;

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
  }
}
