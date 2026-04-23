function updateSodium() {
  const W = width;
  const H = height;

  for (let s of sodiumParticles) {
    s.vel.x += (Math.random() - 0.5) * 5;
    s.vel.y += (Math.random() - 0.5) * 5;
    s.vel.x *= ANGULAR_DAMPING;
    s.vel.y *= ANGULAR_DAMPING;
    s.pos.x += s.vel.x;
    s.pos.y += s.vel.y;

    if (s.pos.x < 0) {
      s.pos.x = 0;
      s.vel.x *= -1;
    }
    if (s.pos.x > W) {
      s.pos.x = W;
      s.vel.x *= -1;
    }
    if (s.pos.y < 0) {
      s.pos.y = 0;
      s.vel.y *= -1;
    }
    if (s.pos.y > H) {
      s.pos.y = H;
      s.vel.y *= -1;
    }

    const key = getCellKey(s.pos.x, s.pos.y);
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push({ type: 'sodium', pos: s.pos, vel: s.vel, ref: s });
  }

  for (let [key, cell] of grid) {
    const col = Math.floor(key / GRID_OFFSET);
    const row = key - col * GRID_OFFSET;

    for (let obj of cell) {
      if (obj.type !== 'sodium') continue;
      const a = obj.ref;

      forEachNeighbor(col, row, (other) => {
        // --- WATER ↔ WATER
        if (other.type === 'sodium') {
          const b = other.ref;
          if (!b || a === b) return;
          if (a.id >= b.id) return;

          sodiumRepel(a, b);
        }
      });
    }
  }
}
function drawSodium() {
  noStroke();

  for (let s of sodiumParticles) {
    fill(0, 100, 0, 150);
    circle(s.pos.x, s.pos.y, 5);
  }
}

function sodiumRepel(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const dist2 = dx * dx + dy * dy;

  // Early-out: beyond the larger of the two ranges.
  const RANGE = 50;
  if (dist2 >= RANGE ** 2 || dist2 === 0) return;

  const dist = Math.sqrt(dist2);
  const nx = dx / dist;
  const ny = dy / dist;

  let fx = 0,
    fy = 0;

  // Repulsion (short range)

  if (dist < RANGE) {
    const strength = 2 * (1 - dist / RANGE);

    fx += nx * strength;
    fy += ny * strength;
  }

  if (fx !== 0 || fy !== 0) {
    a.vel.x += fx;
    a.vel.y += fy;
    b.vel.x -= fx;
    b.vel.y -= fy;
  }

  if (showForces) {
    stroke(255, 255, 0, 150);
    line(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
  }
}
