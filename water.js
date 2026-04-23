function setupWater() {
  for (let i = 0; i < NUM_WATER; i++) {
    waterParticles.push({
      id: nextId++,
      pos: createVector(random(width), random(height)),
      vel: createVector(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      ),
      hydrating: false,
      nearSodium: false,
    });
  }
}

function updateWater() {
  // --- PERF: Replace while-loop length sync with a single conditional block.
  if (waterParticles.length < NUM_WATER) {
    while (waterParticles.length < NUM_WATER) {
      waterParticles.push({
        id: nextId++,
        pos: createVector(random(width), random(height)),
        vel: createVector(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ),
        hydrating: false,
        nearSodium: false,
      });
    }
  } else if (waterParticles.length > NUM_WATER) {
    waterParticles.length = NUM_WATER;
  }

  const W = width;
  const H = height;

  for (let w of waterParticles) {
    w.vel.x += (Math.random() - 0.5) * 3;
    w.vel.y += (Math.random() - 0.5) * 3;
    w.vel.x *= ANGULAR_DAMPING;
    w.vel.y *= ANGULAR_DAMPING;
    w.pos.x += w.vel.x;
    w.pos.y += w.vel.y;

    if (w.pos.x < 0) {
      w.pos.x = 0;
      w.vel.x *= -1;
    }
    if (w.pos.x > W) {
      w.pos.x = W;
      w.vel.x *= -1;
    }
    if (w.pos.y < 0) {
      w.pos.y = 0;
      w.vel.y *= -1;
    }
    if (w.pos.y > H) {
      w.pos.y = H;
      w.vel.y *= -1;
    }

    const key = getCellKey(w.pos.x, w.pos.y);
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push({ type: 'water', pos: w.pos, vel: w.vel, ref: w });
  }

  // Water-water interactions
  for (let [key, cell] of grid) {
    const col = Math.floor(key / GRID_OFFSET);
    const row = key - col * GRID_OFFSET;

    for (let obj of cell) {
      if (obj.type !== 'water') continue;
      const a = obj.ref;

      forEachNeighbor(col, row, (other) => {
        // --- WATER ↔ WATER
        if (other.type === 'water') {
          const b = other.ref;
          if (!b || a === b) return;
          if (a.id >= b.id) return;

          waterInteract(a, b);
        }

        // --- WATER ↔ AQUAPORIN (CHANNEL WALLS)
        if (other.type === 'aquaporin') {
          handleAquaporinChannel(other, a);
        }
      });
    }
  }

  for (let water of waterParticles) {
    water.hydrating = false;
    water.nearSodium = false;
  }
}

function drawWater() {
  noStroke();

  for (let w of waterParticles) {
    let r = 100,
      g = 150,
      b = 255; // default blue

    if (showForces) {
      // Priority order (top overrides bottom)
      if (w.nearSodium) {
        r = 0;
        g = 0;
        b = 255; // blue
      } else if (w.hydrating) {
        r = 0;
        g = 255;
        b = 0; // green
      } else {
        // only check aquaporins if needed
        for (let aq of aquaporins) {
          if (isWaterInsideAquaporin(aq, w)) {
            r = 255;
            g = 0;
            b = 0; // red
            break;
          }
        }
      }
    }

    fill(r, g, b, 150);
    circle(w.pos.x, w.pos.y, 4);
  }
}

function waterInteract(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const dist2 = dx * dx + dy * dy;

  // Early-out: beyond the larger of the two ranges.
  const maxRange = Math.max(WATER_REPULSION_RANGE, TAIL_RANGE);
  if (dist2 >= maxRange * maxRange || dist2 === 0) return;

  const dist = Math.sqrt(dist2);
  const nx = dx / dist;
  const ny = dy / dist;

  let fx = 0,
    fy = 0;

  // Repulsion (short range)
  let repulsionScale = 1;

  // If either water is near sodium → reduce repulsion
  if (a.hydrating || b.hydrating) {
    repulsionScale = 0.2; // 👈 tune this (0.1–0.4 is good)
  }

  if (dist < WATER_REPULSION_RANGE) {
    const strength =
      WATER_REPULSION_FORCE *
      repulsionScale *
      (1 - dist / WATER_REPULSION_RANGE);

    fx += nx * strength;
    fy += ny * strength;
  }

  // Attraction (longer range, original used TAIL_RANGE)
  if (dist < TAIL_RANGE) {
    const strength = 0.8 * (1 - dist / TAIL_RANGE);
    fx += nx * -strength;
    fy += ny * -strength;
  }

  if (fx !== 0 || fy !== 0) {
    a.vel.x += fx;
    a.vel.y += fy;
    b.vel.x -= fx;
    b.vel.y -= fy;
  }

  if (showForces) {
    stroke(0, 255, 0, 150);
    line(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
  }
}
