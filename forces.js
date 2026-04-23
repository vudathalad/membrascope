function tailAttract(a, b) {
  const tax = a.tailMid.x,
    tay = a.tailMid.y;
  const tbx = b.tailMid.x,
    tby = b.tailMid.y;

  const max = a.trueMid.x,
    may = a.trueMid.y;
  const mbx = b.trueMid.x,
    mby = b.trueMid.y;

  const edx = tbx - tax,
    edy = tby - tay;
  const mdx = mbx - max,
    mdy = mby - may;

  const midMag2 = mdx * mdx + mdy * mdy;

  const min2 = LIPID_LENGTH * LIPID_LENGTH;
  const max2 = TAIL_RANGE * TAIL_RANGE;

  // correct early-out
  if (midMag2 < min2 || midMag2 > max2) return;

  // alignment
  const angleDiff = a.angle - b.angle;
  const c = Math.cos(angleDiff);
  const alignment = c * c;

  // --- END FORCE
  const endMag2 = edx * edx + edy * edy;
  if (endMag2 > 0) {
    const invEndMag = 1 / Math.sqrt(endMag2);
    const endMag = endMag2 * invEndMag; // faster than sqrt again

    const ef = TAIL_FORCE * (1 - endMag / TAIL_RANGE) * alignment * invEndMag;

    const efx = edx * ef;
    const efy = edy * ef;

    a.applyForce(efx, efy, tax, tay);
    b.applyForce(-efx, -efy, tbx, tby);
  }

  // --- MID FORCE
  const invMidMag = 1 / Math.sqrt(midMag2);
  const midMag = midMag2 * invMidMag;

  const mf = TAIL_FORCE * (1 - midMag / TAIL_RANGE) * alignment * invMidMag;

  const mfx = mdx * mf;
  const mfy = mdy * mf;

  a.applyForce(mfx, mfy, max, may);
  b.applyForce(-mfx, -mfy, mbx, mby);

  if (showForces) {
    stroke(0, 0, 255);
    line(tax, tay, tbx, tby);
    line(max, may, mbx, mby);
  }
}

function headTailRepel(a, b) {
  const hax = a.headPos.x,
    hay = a.headPos.y;
  const tbx = b.tailMid.x,
    tby = b.tailMid.y;

  const dx = hax - tbx,
    dy = hay - tby;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag > 0 && mag < REPULSION_RANGE) {
    if (showForces) {
      stroke(255, 0, 0);
      line(tbx, tby, hax, hay);
    }
    // dx/dy points FROM tail TO head; push each away from the other.
    const strength = (REPULSION_FORCE * (1 - mag / REPULSION_RANGE)) / mag;
    const fx = dx * strength,
      fy = dy * strength;
    a.applyForce(fx, fy, hax, hay); // head pushed away from tail
    b.applyForce(-fx, -fy, tbx, tby); // tail pushed away from head
  }
}

function tailRepel(a, b) {
  const tax = a.tailMid.x,
    tay = a.tailMid.y;
  const tbx = b.tailMid.x,
    tby = b.tailMid.y;
  const max = a.trueMid.x,
    may = a.trueMid.y;
  const mbx = b.trueMid.x,
    mby = b.trueMid.y;

  const edx = tbx - tax,
    edy = tby - tay;
  const mdx = mbx - max,
    mdy = mby - may;
  // NOTE: Original code uses midMag for both endMag and midMag checks (appears intentional).
  const midMag = Math.sqrt(mdx * mdx + mdy * mdy);

  if (midMag > 0 && midMag < LIPID_LENGTH) {
    if (showForces) {
      stroke(255, 0, 0);
      line(tax, tay, tbx, tby);
      line(max, may, mbx, mby);
    }

    const endMag = Math.sqrt(edx * edx + edy * edy);
    if (endMag > 0) {
      const ef =
        (-HEAD_REPULSION_FORCE * (1 - (midMag / LIPID_LENGTH) * 1.5)) / endMag;
      const efx = edx * ef,
        efy = edy * ef;
      a.applyForce(-efx, -efy, tax, tay);
      b.applyForce(efx, efy, tbx, tby);
    }

    if (midMag > 0) {
      const mf =
        (-HEAD_REPULSION_FORCE * (1 - (midMag / LIPID_LENGTH) * 1.5)) / midMag;
      const mfx = mdx * mf,
        mfy = mdy * mf;
      a.applyForce(-mfx, -mfy, max, may);
      b.applyForce(mfx, mfy, mbx, mby);
    }
  }
}

function headRepel(a, b) {
  const hax = a.headPos.x,
    hay = a.headPos.y;
  const hbx = b.headPos.x,
    hby = b.headPos.y;

  const dx = hax - hbx,
    dy = hay - hby;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag > 0 && mag < LIPID_LENGTH) {
    if (showForces) {
      line(hax, hay, hbx, hby);
    }
    // dx/dy points FROM hb TO ha; push each head away from the other.
    const strength = (HEAD_REPULSION_FORCE * (1 - mag / LIPID_LENGTH)) / mag;
    const fx = dx * strength,
      fy = dy * strength;
    a.applyForce(fx, fy, hax, hay);
    b.applyForce(-fx, -fy, hbx, hby);
  }
}

function tailWaterRepel(lipid, w) {
  for (let aq of aquaporins) if (isWaterInsideAquaporin(aq, w)) return;

  const dx = lipid.tailMid.x - w.pos.x;
  const dy = lipid.tailMid.y - w.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > 0 && d < TAIL_WATER_RANGE) {
    const invD = 1 / d;
    const nx = dx * invD,
      ny = dy * invD;
    const lipidStrength = TAIL_WATER * 1.5 * (1 - d / TAIL_WATER_RANGE);
    lipid.applyForce(
      nx * lipidStrength,
      ny * lipidStrength,
      lipid.tailMid.x,
      lipid.tailMid.y
    );

    const waterStrength = -TAIL_WATER * (1 - d / TAIL_WATER_RANGE);
    w.vel.x += nx * waterStrength;
    w.vel.y += ny * waterStrength;

    if (showForces) {
      stroke(200, 0, 0, d);
      line(lipid.tailMid.x, lipid.tailMid.y, w.pos.x, w.pos.y);
    }
  }
}

function headWaterAttract(lipid, w) {
  for (let aq of aquaporins) if (isWaterInsideAquaporin(aq, w)) return;

  const dx = w.pos.x - lipid.headPos.x;
  const dy = w.pos.y - lipid.headPos.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > 0 && d < HEAD_WATER_RANGE) {
    const invD = 1 / d;
    const nx = dx * invD,
      ny = dy * invD;
    const strength = HEAD_WATER * (1 - d / HEAD_WATER_RANGE);
    const cappedStrength = strength / (1 + strength * 2);
    const fx = nx * cappedStrength,
      fy = ny * cappedStrength;
    lipid.applyForce(fx, fy, lipid.headPos.x, lipid.headPos.y);
    w.vel.x -= fx;
    w.vel.y -= fy;

    if (showForces) {
      stroke(0, 0, 200, d);
      line(lipid.tailMid.x, lipid.tailMid.y, w.pos.x, w.pos.y);
    }
  }
}

function alignParallel(a, b) {
  const dx = b.tailMid.x - a.tailMid.x;
  const dy = b.tailMid.y - a.tailMid.y;
  const d2 = dx * dx + dy * dy;
  if (d2 === 0 || d2 > TAIL_RANGE * TAIL_RANGE) return;

  const angleDiff = b.angle - a.angle;
  // --- PERF: Use atan2(sin, cos) inline without creating a p5.Vector
  const normalized = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
  a.spin += normalized * ALIGN_FORCE;
  b.spin -= normalized * ALIGN_FORCE;
}

function hydrophobicWaterRepel(aquaporin, region, w) {
  if (region.type != 'hydrophobic') return;
  if (!region) return; // prevents crashes
  if (isWaterInsideAquaporin(aquaporin, w)) return;

  const dx = region.pos.x - w.pos.x;
  const dy = region.pos.y - w.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > 0 && d < TAIL_WATER_RANGE) {
    const invD = 1 / d;
    const nx = dx * invD,
      ny = dy * invD;
    const aquaporinStrength = TAIL_WATER * (1 - d / TAIL_WATER_RANGE);
    aquaporin.applyForce(
      nx * aquaporinStrength,
      ny * aquaporinStrength,
      aquaporin.pos.x,
      aquaporin.pos.y
    );

    const waterStrength = -TAIL_WATER * (1 - d / TAIL_WATER_RANGE);
    w.vel.x += nx * waterStrength;
    w.vel.y += ny * waterStrength;

    if (showForces) {
      stroke(200, 0, 0, d);
      line(region.pos.x, region.pos.y, w.pos.x, w.pos.y);
    }
  }
}

function hydrophilicWaterAttract(aquaporin, region, w) {
  if (region.type != 'hydrophilic') return;
  if (!region) return; // prevents crashes
  if (isWaterInsideAquaporin(aquaporin, w)) return;

  const dx = w.pos.x - region.pos.x;
  const dy = w.pos.y - region.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d > 0 && d < HEAD_WATER_RANGE) {
    const invD = 1 / d;
    const nx = dx * invD,
      ny = dy * invD;
    const strength = HEAD_WATER * (1 - d / HEAD_WATER_RANGE);
    const fx = nx * strength,
      fy = ny * strength;
    aquaporin.applyForce(fx * 0.5, fy * 0.5, aquaporin.pos.x, aquaporin.pos.y);
    w.vel.x -= fx;
    w.vel.y -= fy;

    if (showForces) {
      stroke(0, 0, 200, d);
      line(region.pos.x, region.pos.y, w.pos.x, w.pos.y);
    }
  }
}

function aquaporinLipidRepel(aq, lipid) {
  // molecule is aquaporin, other is lipid
  if (aq.type !== 'aquaporin' || lipid.type !== 'lipid') return;

  const REPULSION_RANGE = LIPID_LENGTH * 5; // gentle range
  const REPULSION_STRENGTH = 3;

  const dx = lipid.tailMid.x - aq.pos.x;
  const dy = lipid.tailMid.y - aq.pos.y;

  const ca = aq._cosA;
  const sa = aq._sinA;

  // Local coordinates
  const localX = dx * ca + dy * sa;
  const localY = -dx * sa + dy * ca;

  // Only repel if inside aquaporin width (channel area)
  if (Math.abs(localX) < aq.width * 0.5) {
    const dist = Math.abs(localX);
    if (dist > 0 && dist < REPULSION_RANGE) {
      const forceMag = REPULSION_STRENGTH * (1 - dist / REPULSION_RANGE);

      // Push outward (left or right)
      const dir = localX > 0 ? 1 : -1;

      // Convert back to world space
      const fx = ca * dir * forceMag;
      const fy = sa * dir * forceMag;

      lipid.applyForce(fx, fy, lipid.pos.x, lipid.pos.y);

      // Small reaction on aquaporin
      aq.applyForce(-fx * 0.2, -fy * 0.2, aq.pos.x, aq.pos.y);
    }
  }
}

function sodiumWaterAttract(sodium, water) {
  const dx = sodium.pos.x - water.pos.x;
  const dy = sodium.pos.y - water.pos.y;
  const dist2 = dx * dx + dy * dy;

  // Early-out: beyond the larger of the two ranges.
  const RANGE = 12;

  if (dist2 < 40 ** 2) {
    water.nearSodium = true;

    const inv = 1 / Math.sqrt(dist2);
    water.sodiumDX = dx * inv;
    water.sodiumDY = dy * inv;
  }

  if (dist2 >= RANGE * RANGE || dist2 === 0) return;

  const dist = Math.sqrt(dist2);
  const nx = dx / dist;
  const ny = dy / dist;

  let fx = 0,
    fy = 0;

  let damping = 0.01;

  // Repulsion
  if (dist < 7) {
    water.vel.x *= damping;
    water.vel.x += sodium.vel.x * 0.7;

    water.vel.y *= damping;
    water.vel.y += sodium.vel.y * 0.7;
    return;
  }

  // Attraction (longer range, original used TAIL_RANGE)
  if (dist < RANGE) {
    const strength = 10 * (1 - dist / RANGE);
    fx += nx * strength;
    fy += ny * strength;
    water.hydrating = true;
  }

  if (fx !== 0 || fy !== 0) {
    sodium.vel.x -= fx * 0.5;
    sodium.vel.y -= fy * 0.5;
    water.vel.x += fx;
    water.vel.y += fy;
  }

  if (showForces) {
    stroke(0, 255, 255, 150);
    line(sodium.pos.x, sodium.pos.y, water.pos.x, water.pos.y);
  }
}

function sodiumTailRepel(sodium, lipid) {
  if (lipid.type !== 'lipid') return;
  const dx = sodium.pos.x - lipid.tailMid.x;
  const dy = sodium.pos.y - lipid.tailMid.y;
  const d2 = dx * dx + dy * dy;

  const RANGE = 40;
  if (d2 === 0 || d2 > RANGE * RANGE) return;

  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;

  const strength = 2 * (1 - d / RANGE);

  sodium.vel.x += nx * strength;
  sodium.vel.y += ny * strength;

  // Optional: slight push back on lipid
  lipid.applyForce(
    -nx * strength * 0.2,
    -ny * strength * 0.2,
    lipid.tailMid.x,
    lipid.tailMid.y
  );

  if (showForces) {
    stroke(255, 150, 0, 150);
    line(sodium.pos.x, sodium.pos.y, lipid.pos.x, lipid.pos.y);
  }
}
