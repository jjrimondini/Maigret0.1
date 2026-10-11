// Funzioni di supporto usate dall'intelligenza dei criminali.
// Lo stato del gioco viene passato tramite "game", evitando variabili globali.

export function wall(game, x, y) {
  return x < 0 || y < 0 || x >= game.COLS || y >= game.ROWS ||
         game.map[y][x] === "#";
}

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

export function chooseCellTarget(game, criminal) {
  const prisoners = game.criminals.filter(other => other.arrested && other !== criminal);
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
