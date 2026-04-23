class Lipid {
  constructor(x, y) {
    this.id = nextId++;

    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);

    this.angle = random(TWO_PI);
    this.spin = 0;
    this.type = 'lipid';

    // --- PERF: Pre-allocate all geometry vectors once; reuse every frame.
    this.headPos = createVector(0, 0);
    this.tailMid = createVector(0, 0);
    this.trueMid = createVector(0, 0);
    this.left = { base: createVector(0, 0), end: createVector(0, 0) };
    this.right = { base: createVector(0, 0), end: createVector(0, 0) };

    // --- PERF: Cache trig values so updateGeometry doesn't recompute them
    // when the angle hasn't changed (spin is near zero).
    this._cachedAngle = NaN;
    this._cosA = 0;
    this._sinA = 0;
  }

  applyForce(fx, fy, px, py) {
    // --- PERF: Accept raw numbers instead of p5.Vector objects to avoid
    // allocating temporary vectors for every force application.
    this.vel.x += fx;
    this.vel.y += fy;

    const rx = px - this.pos.x;
    const ry = py - this.pos.y;
    this.spin += (rx * fy - ry * fx) * 0.001;
  }

  updateGeometry() {
    // --- PERF: Only recompute sin/cos when angle actually changed.
    if (this._cachedAngle !== this.angle) {
      this._cachedAngle = this.angle;
      this._cosA = Math.cos(this.angle);
      this._sinA = Math.sin(this.angle);
    }

    const ca = this._cosA;
    const sa = this._sinA;
    const px = this.pos.x;
    const py = this.pos.y;
    const L = LIPID_LENGTH;

    // Head: projects forward from pos along the facing direction
    this.headPos.x = px + ca * L;
    this.headPos.y = py + sa * L;

    // forward = angle-direction scaled by L (toward head)
    const fwdX = ca * L;
    const fwdY = sa * L;

    // backward = -forward * (L/2): steps from the forward tip back toward pos
    const bwdX = -ca * ((L * L) / 2);
    const bwdY = -sa * ((L * L) / 2);

    // perp = perpendicular to facing, scaled by L/3 (lateral tail spread)
    const perpX = -sa * (L / 3);
    const perpY = ca * (L / 3);

    // Left tail base: at (pos + forward + perp), i.e. beside the head
    // Left tail end:  steps backward by L/2 from the base
    const lBaseX = px + fwdX + perpX;
    const lBaseY = py + fwdY + perpY;
    this.left.base.x = lBaseX;
    this.left.base.y = lBaseY;
    this.left.end.x = lBaseX + bwdX;
    this.left.end.y = lBaseY + bwdY;

    // Right tail (mirror of left)
    const rBaseX = px + fwdX - perpX;
    const rBaseY = py + fwdY - perpY;
    this.right.base.x = rBaseX;
    this.right.base.y = rBaseY;
    this.right.end.x = rBaseX + bwdX;
    this.right.end.y = rBaseY + bwdY;

    // tailMid: midpoint of the two tail ends
    this.tailMid.x = (this.left.end.x + this.right.end.x) * 0.5;
    this.tailMid.y = (this.left.end.y + this.right.end.y) * 0.5;

    // trueMid: midpoint between the base-midpoint and tailMid
    const midBaseX = (lBaseX + rBaseX) * 0.5;
    const midBaseY = (lBaseY + rBaseY) * 0.5;
    this.trueMid.x = (midBaseX + this.tailMid.x) * 0.5;
    this.trueMid.y = (midBaseY + this.tailMid.y) * 0.5;
  }

  draw(hover = 0) {
    stroke(hover * 0.5);
    strokeWeight(1);
    fill(255, 255, 255, 150);
    line(this.left.base.x, this.left.base.y, this.left.end.x, this.left.end.y);
    line(
      this.right.base.x,
      this.right.base.y,
      this.right.end.x,
      this.right.end.y
    );
    circle(this.headPos.x, this.headPos.y, LIPID_LENGTH);
  }
}
