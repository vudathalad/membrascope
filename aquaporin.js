class Aquaporin {
  constructor(x, y) {
    this.id = nextId++;

    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);

    this.angle = random(TWO_PI);
    this.spin = 0;
    this.type = 'aquaporin';

    // --- Layout parameters
    this.width = LIPID_LENGTH * 4;
    this.height = LIPID_LENGTH * 8;

    // --- Preallocate 12 regions
    this.regions = {
      leftTopLeft: this._makeRegion('hydrophilic'),
      leftMiddleLeft: this._makeRegion('hydrophobic'),
      leftBottomLeft: this._makeRegion('hydrophilic'),

      rightTopRight: this._makeRegion('hydrophilic'),
      rightMiddleRight: this._makeRegion('hydrophobic'),
      rightBottomRight: this._makeRegion('hydrophilic'),
    };

    // Cached trig
    this._cachedAngle = NaN;
    this._cosA = 0;
    this._sinA = 0;
  }

  _makeRegion(type) {
    return {
      pos: createVector(0, 0),
      type: type,
    };
  }

  applyForce(fx, fy, px, py) {
    const MASS = 1;

    this.vel.x += fx / MASS;
    this.vel.y += fy / MASS;

    const rx = px - this.pos.x;
    const ry = py - this.pos.y;
    this.spin += (rx * fy - ry * fx) * 0.001;
  }

  updateGeometry() {
    if (this._cachedAngle !== this.angle) {
      this._cachedAngle = this.angle;
      this._cosA = Math.cos(this.angle);
      this._sinA = Math.sin(this.angle);
    }

    const ca = this._cosA;
    const sa = this._sinA;

    const px = this.pos.x;
    const py = this.pos.y;

    // Local axes
    const rightX = ca;
    const rightY = sa;

    const upX = -sa;
    const upY = ca;

    const { halfW, halfH } = this.getChannelBounds();

    // Row offsets
    const top = -halfH;
    const mid = 0;
    const bot = halfH;

    // Column offsets
    const left = -halfW;
    const right = halfW;

    // Small horizontal offsets (for left/right within each side)
    const inner = this.width * 0.1;

    /*console.log('width, height:', this.width, this.height);
    console.log('pos:', px, py);
    console.log('angle:', this.angle);
    console.log('spin', this.spin);*/
    const place = (region, sideX, sideY, offsetX, offsetY) => {
      region.pos.x = px + rightX * (sideX + offsetX) + upX * (sideY + offsetY);
      region.pos.y = py + rightY * (sideX + offsetX) + upY * (sideY + offsetY);
    };

    // LEFT SIDE
    place(this.regions.leftTopLeft, left, top, -inner, 0);
    place(this.regions.leftMiddleLeft, left, mid, -inner, 0);
    place(this.regions.leftBottomLeft, left, bot, -inner, 0);

    // RIGHT SIDE
    place(this.regions.rightTopRight, right, top, inner, 0);
    place(this.regions.rightMiddleRight, right, mid, inner, 0);
    place(this.regions.rightBottomRight, right, bot, inner, 0);
  }

  getChannelBounds() {
    return {
      halfW: this.width * 0.18, // narrow channel
      halfH: this.height * 0.5, // full height
    };
  }

  draw(hover = 255) {
    for (let key in this.regions) {
      const r = this.regions[key];

      if (r.type === 'hydrophilic') {
        fill(0, 150, 255, hover);
      } else if (r.type === 'hydrophobic') {
        fill(255, 150, 0, hover);
      }

      noStroke();
      circle(r.pos.x, r.pos.y, 7);
      this.drawChannel(hover != 255 ? hover : 0);
    }
  }

  drawChannel(hover) {
    const { halfW, halfH } = this.getChannelBounds();

    const ca = this._cosA;
    const sa = this._sinA;

    const drawLine = (lx, ly1, ly2) => {
      const x1 = this.pos.x + lx * ca + ly1 * -sa;
      const y1 = this.pos.y + lx * sa + ly1 * ca;

      const x2 = this.pos.x + lx * ca + ly2 * -sa;
      const y2 = this.pos.y + lx * sa + ly2 * ca;

      line(x1, y1, x2, y2);
    };

    stroke(hover);
    strokeWeight(2);

    // Left wall
    drawLine(-halfW, -halfH, halfH);

    // Right wall
    drawLine(halfW, -halfH, halfH);
  }
}

function isWaterInsideAquaporin(aq, w) {
  // Translate into aquaporin-centered space
  const dx = w.pos.x - aq.pos.x;
  const dy = w.pos.y - aq.pos.y;

  // Rotate into aquaporin local space (inverse rotation)
  const ca = aq._cosA;
  const sa = aq._sinA;

  // Inverse rotation = transpose of rotation matrix
  const localX = dx * ca + dy * sa;
  const localY = -dx * sa + dy * ca;

  // Define channel bounds (tighter than full width!)
  const { halfW, halfH } = aq.getChannelBounds();

  return localX > -halfW && localX < halfW && localY > -halfH && localY < halfH;
}

function handleAquaporinChannel(aq, w) {
  const dx = w.pos.x - aq.pos.x;
  const dy = w.pos.y - aq.pos.y;

  const ca = aq._cosA;
  const sa = aq._sinA;

  let localX = dx * ca + dy * sa;
  let localY = -dx * sa + dy * ca;

  const { halfW, halfH } = aq.getChannelBounds();

  let damping = 0.8;

  // Only inside vertical span
  if (localY < -halfH || localY > halfH) return;
  // Only process if particle is near the channel horizontally
  if (localX < -halfW - 5 || localX > halfW + 5) return;

  // Convert velocity to local space
  const vx = w.vel.x;
  const vy = w.vel.y;
  let localVX = vx * ca + vy * sa;
  let localVY = -vx * sa + vy * ca;

  if (w.nearSodium) {
    // Convert sodium direction into channel-local coordinates
    const sdx = w.sodiumDX;
    const sdy = w.sodiumDY;

    const localSDY = -sdx * sa + sdy * ca; // projection onto channel axis

    // 🔥 push AWAY from sodium
    const exitDir = localSDY > 0 ? 1 : -1;

    localVY = exitDir * 8;

    // write back
    w.vel.x = localVX * ca + localVY * -sa;
    w.vel.y = localVX * sa + localVY * ca;

    return;
  }

  let collided = false;

  // --- LEFT WALL
  if (localX < -halfW + 3) {
    localX = -halfW + 3; // ✅ minimal correction
    localVX = 0;

    collided = true;
  }

  // --- RIGHT WALL
  if (localX > halfW - 3) {
    localX = halfW - 3; // ✅ minimal correction
    localVX = 0;

    collided = true;
  }

  if (localVY < 0) {
    localVY = -6;
  } else if (localVY > 0) {
    localVY = 6;
  }

  if (collided) {
    // Convert position back
    w.pos.x = aq.pos.x + localX * ca + localY * -sa;
    w.pos.y = aq.pos.y + localX * sa + localY * ca;

    // Convert velocity back
    w.vel.x = localVX * ca + localVY * -sa;
    w.vel.x *= damping;

    w.vel.y = localVX * sa + localVY * ca;
    w.vel.y *= damping;
  }
}
