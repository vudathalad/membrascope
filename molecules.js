function hoverMolecule() {
  if (drawMode === 'water' || drawMode === 'sodium') return;
  if (!hoverDraw || hoverDraw.type != drawMode) {
    hoverDraw =
      drawMode === 'lipid'
        ? new Lipid(mouseX, mouseY)
        : new Aquaporin(mouseX, mouseY);
  }
  if (hoverDraw.type === 'aquaporin') {
    if (keyIsDown(82)) hoverDraw.angle += 0.1;
  }

  hoverDraw.pos.x = mouseX;
  hoverDraw.pos.y = mouseY;

  hoverDraw.updateGeometry();
  hoverDraw.draw(150);
}

function createMolecule(type) {
  if (type === 'water' || type === 'sodium') {
    let parentArray = type === 'water' ? waterParticles : sodiumParticles;
    parentArray.push({
      id: nextId++,
      pos: createVector(mouseX, mouseY),
      vel: createVector(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      ),
      hydrating: false,
      nearSodium: false,
    });
    if (type === 'water') NUM_WATER++;
    return;
  }

  let molecule =
    type === 'lipid'
      ? new Lipid(mouseX, mouseY)
      : new Aquaporin(mouseX, mouseY);
  if (type == 'aquaporin') molecule.angle = hoverDraw.angle;
  molecule.updateGeometry();

  let parentArray = type === 'lipid' ? lipids : aquaporins;
  parentArray.push(molecule);

  count.innerText = lipids.length;
}

function mousePressed(e) {
  if (!isMouseOverUI()) return;
  if (!e.shiftKey) createMolecule(drawMode);
}

function updateMolecule(type) {
  const W = width;
  const H = height;

  let parentArray = type == 'lipid' ? lipids : aquaporins;

  for (let molecule of parentArray) {
    molecule.vel.x *= DAMPING;
    molecule.vel.y *= DAMPING;
    molecule.pos.x += molecule.vel.x;
    molecule.pos.y += molecule.vel.y;
    // Hard clamp as final backstop — guarantee pos stays in bounds.
    if (molecule.pos.x < 0) {
      molecule.pos.x = 0;
      molecule.vel.x = Math.abs(molecule.vel.x);
    }
    if (molecule.pos.x > W) {
      molecule.pos.x = W;
      molecule.vel.x = -Math.abs(molecule.vel.x);
    }
    if (molecule.pos.y < 0) {
      molecule.pos.y = 0;
      molecule.vel.y = Math.abs(molecule.vel.y);
    }
    if (molecule.pos.y > H) {
      molecule.pos.y = H;
      molecule.vel.y = -Math.abs(molecule.vel.y);
    }

    // --- PERF: Inline magnitude check with squared distance to avoid sqrt.
    const vx = molecule.vel.x,
      vy = molecule.vel.y;
    const spd2 = vx * vx + vy * vy;
    if (spd2 > MAX_SPEED * MAX_SPEED) {
      const inv = MAX_SPEED / Math.sqrt(spd2);
      molecule.vel.x *= inv;
      molecule.vel.y *= inv;
    }

    molecule.spin *= ANGULAR_DAMPING;
    // --- PERF: random() called once per molecule per frame; keep as-is (needed).
    molecule.spin += random(-0.003, 0.003);
    // Guard against NaN
    if (!Number.isFinite(molecule.spin)) molecule.spin = 0;

    molecule.angle += molecule.spin;

    // Guard against NaN angle
    if (!Number.isFinite(molecule.angle)) molecule.angle = 0;

    // Small random nudge — inline applyForce to avoid a method call overhead.
    const rndX = (Math.random() - 0.5) * 0;
    const rndY = (Math.random() - 0.5) * 0;
    molecule.vel.x += rndX;
    molecule.vel.y += rndY;

    molecule.updateGeometry();
    molecule.draw();
  }
}

function setDrawMode(mode) {
  drawMode = mode;

  document.querySelectorAll('#drawControls button').forEach((btn) => {
    btn.classList.remove('active');
  });

  document
    .querySelector(`#drawControls button[onclick="setDrawMode('${mode}')"]`)
    .classList.add('active');
}
