// Funzioni di supporto usate dall'intelligenza dei criminali.
// Lo stato del gioco viene passato tramite "game", evitando variabili globali.

/*
 * wall(game, x, y)
 * Dice se la casella (x, y) NON è percorribile.
 * Restituisce true se la casella è fuori dalla mappa (coordinate negative o
 * oltre COLS/ROWS) oppure se nella mappa contiene un muro "#".
 * È usata ovunque serva sapere se ci si può spostare in una casella:
 * dal giocatore (main.js) e da tutte le funzioni di ricerca del percorso qui sotto.
 */
export function wall(game, x, y) {
  return x < 0 || y < 0 || x >= game.COLS || y >= game.ROWS ||
         game.map[y][x] === "#";
}

/*
 * findPath(game, start, target)
 * Trova il percorso più breve da "start" a "target" con una ricerca in
 * ampiezza (BFS): parte da start ed esplora le caselle vicine (destra,
 * sinistra, giù, su) "a cerchi concentrici", quindi la prima volta che
 * raggiunge il target ha trovato la strada più corta.
 * - Evita i muri e le caselle occupate da criminali liberi; NON tiene conto
 *   di dove si trova Maigret.
 * - La mappa "previous" ricorda da quale casella si è arrivati a ciascuna
 *   casella: arrivati al target si ripercorre all'indietro fino a start
 *   per ricostruire il cammino.
 * Restituisce l'elenco delle caselle da attraversare (esclusa la partenza,
 * incluso l'arrivo), quindi la sua lunghezza è il numero di passi.
 * Restituisce un array vuoto se non c'è un target o se è irraggiungibile.
 */
export function findPath(game, start, target) {
  if (!target) return [];

  const key = p => `${p.x},${p.y}`;
  const queue = [{ x: start.x, y: start.y }];
  const previous = new Map([[key(start), null]]);

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];

    if (current.x === target.x && current.y === target.y) {
      const path = [];
      let k = key(current);

      while (k !== key(start)) {
        const [x, y] = k.split(",").map(Number);
        path.unshift({ x, y });
        k = previous.get(k);
      }
      return path;
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ];

    for (const next of neighbors) {
      const k = key(next);
      const occupied = game.criminals.some(c =>
        !c.arrested && c.x === next.x && c.y === next.y
      );

      if (wall(game, next.x, next.y) || occupied || previous.has(k)) continue;
      previous.set(k, key(current));
      queue.push(next);
    }
  }
  return [];
}

/*
 * findSafePath(game, start, target, criminal)
 * Come findPath cerca una strada da "start" a "target", ma preferisce le
 * strade che stanno lontane da Maigret.
 * - A ogni giro ordina le caselle da esplorare per un "punteggio":
 *   lunghezza del percorso fatto finora + una penalità se la casella è a
 *   meno di 5 passi da Maigret (4 punti per ogni passo sotto i 5).
 *   Esplora sempre per prima la casella col punteggio più basso.
 * - Non passa mai sulla casella di Maigret, né sui muri, né sulle caselle
 *   occupate da altri criminali liberi (il criminale stesso viene ignorato).
 * - Ogni elemento in coda si porta dietro il proprio percorso ("path"),
 *   quindi quando si raggiunge il target lo si restituisce direttamente.
 * Il risultato è un percorso "abbastanza sicuro", non per forza il più corto.
 * Restituisce un array vuoto se non c'è un target o se è irraggiungibile.
 */
export function findSafePath(game, start, target, criminal) {
  if (!target) return [];

  const key = p => `${p.x},${p.y}`;
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const visited = new Set([key(start)]);

  while (queue.length > 0) {
    queue.sort((a, b) => {
      const score = p => {
        const distanceToPlayer = Math.abs(p.x - game.player.x) + Math.abs(p.y - game.player.y);
        return p.path.length + Math.max(0, 5 - distanceToPlayer) * 4;
      };
      return score(a) - score(b);
    });

    const current = queue.shift();
    if (current.x === target.x && current.y === target.y) return current.path;

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ];

    for (const next of neighbors) {
      const k = key(next);
      if (visited.has(k) || wall(game, next.x, next.y)) continue;
      if (next.x === game.player.x && next.y === game.player.y) continue;

      const occupied = game.criminals.some(other =>
        other !== criminal && !other.arrested &&
        other.x === next.x && other.y === next.y
      );
      if (occupied) continue;

      visited.add(k);
      queue.push({ x: next.x, y: next.y, path: [...current.path, next] });
    }
  }
  return [];
}

/*
 * isPrisoner(c): true se il criminale è in cella e si può ancora liberare.
 * Chi è stato arrestato con la centrale di polizia attiva ha c.removed:
 * resta arrestato ma i compagni non vanno più a liberarlo.
 */
export function isPrisoner(c) {
  return c.arrested && !c.removed;
}

/*
 * chooseCellTarget(game, criminal)
 * Sceglie verso quale cella deve dirigersi il criminale, cioè la cella
 * ("home") di un compagno già arrestato. Non restituisce nulla: scrive la
 * scelta direttamente in criminal.target.
 * - Se non ci sono compagni arrestati, il target diventa null.
 * - Esclude le celle già scelte come target da altri criminali liberi
 *   ("riservate"), così non vanno tutti nello stesso posto; se però sono
 *   tutte riservate, le considera comunque tutte.
 * - Se il criminale è "furbo" sceglie la cella più vicina (calcolata con
 *   findPath); con qualsiasi altra personalità ne sceglie una a caso.
 * Il target è una copia delle coordinate, così modificarlo non altera la
 * "home" del prigioniero.
 */
export function chooseCellTarget(game, criminal) {
  const prisoners = game.criminals.filter(other => isPrisoner(other) && other !== criminal);
  if (prisoners.length === 0) {
    criminal.target = null;
    return;
  }

  const reserved = game.criminals
    .filter(other => other !== criminal && !other.arrested && other.target)
    .map(other => `${other.target.x},${other.target.y}`);

  let available = prisoners.filter(prisoner =>
    !reserved.includes(`${prisoner.home.x},${prisoner.home.y}`)
  );
  if (available.length === 0) available = prisoners;

  if (criminal.personality === "furbo") {
    available.sort((a, b) =>
      findPath(game, criminal, a.home).length - findPath(game, criminal, b.home).length
    );
    criminal.target = { ...available[0].home };
    return;
  }

  const target = available[Math.floor(Math.random() * available.length)];
  criminal.target = { ...target.home };
}

/*
 * evadeMaigret(game, criminal, target)
 * Fa fare al criminale UN passo, scegliendo la casella vicina migliore per
 * scappare da Maigret e, se c'è un target, avvicinarsi a esso.
 * - Considera le 4 caselle adiacenti e scarta muri, la casella di Maigret
 *   e quelle occupate da altri criminali liberi.
 * - Se non resta nessuna mossa possibile restituisce false (il criminale è
 *   bloccato e non si muove).
 * - A ogni mossa possibile dà un punteggio (più basso = migliore):
 *   distanza dal target in passi (via findPath; 1000 se irraggiungibile,
 *   0 se non c'è target) + penalità di pericolo (3 punti per ogni passo
 *   sotto i 5 di distanza da Maigret, contando caselle in orizzontale +
 *   in verticale e ignorando i muri).
 * - Tra le mosse col punteggio migliore ne sceglie una a caso, sposta il
 *   criminale lì e restituisce true.
 */
export function evadeMaigret(game, criminal, target) {
  const options = [
    { x: criminal.x + 1, y: criminal.y },
    { x: criminal.x - 1, y: criminal.y },
    { x: criminal.x, y: criminal.y + 1 },
    { x: criminal.x, y: criminal.y - 1 }
  ].filter(p => {
    if (wall(game, p.x, p.y)) return false;
    if (p.x === game.player.x && p.y === game.player.y) return false;
    return !game.criminals.some(other =>
      other !== criminal && !other.arrested && other.x === p.x && other.y === p.y
    );
  });

  if (!options.length) return false;

  const scored = options.map(p => {
    const distanceToPlayer = Math.abs(p.x - game.player.x) + Math.abs(p.y - game.player.y);
    let distanceToTarget = 0;

    if (target) {
      if (p.x === target.x && p.y === target.y) distanceToTarget = 0;
      else {
        const path = findPath(game, p, target);
        distanceToTarget = path.length > 0 ? path.length : 1000;
      }
    }

    const dangerPenalty = Math.max(0, 5 - distanceToPlayer) * 3;
    return { ...p, score: distanceToTarget + dangerPenalty };
  });

  scored.sort((a, b) => a.score - b.score);
  const bestScore = scored[0].score;
  const bestOptions = scored.filter(p => p.score === bestScore);
  const next = bestOptions[Math.floor(Math.random() * bestOptions.length)];

  criminal.x = next.x;
  criminal.y = next.y;
  return true;
}
