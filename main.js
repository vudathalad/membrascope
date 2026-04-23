let LIPID_LENGTH = 5;
let TAIL_FORCE = 0.05;
let TAIL_RANGE = 10;
let TAIL_WATER = 1.75;
let TAIL_WATER_RANGE = 35;
let HEAD_WATER = 0.8;
let HEAD_WATER_RANGE = 35;
let REPULSION_FORCE = 0.5;
let REPULSION_RANGE = 35;
let HEAD_REPULSION_FORCE = 2;
let DAMPING = 0.8;
let ANGULAR_DAMPING = 0.9;
let MAX_SPEED = 2;
let ALIGN_FORCE = 0.0001;
let NUM_WATER = 5000;
let WATER_REPULSION_FORCE = 5;
let WATER_REPULSION_RANGE = 15;

const GRID_SIZE = Math.max(TAIL_RANGE, REPULSION_RANGE);
const GRID_OFFSET = 10000;

// --- PERF: Use a flat Map with integer keys instead of a string-keyed object.
// Encodes (col, row) as a single integer: col * OFFSET + row.
// Eliminates string allocation + split + parseInt on every grid access.

let grid = new Map();
let nextId = 0;
let lipids = [];
let aquaporins = [];
let waterParticles = [];
let sodiumParticles = [];
let drawMode = 'lipid';
let shiftDown = false;
let hoverDraw;

// --- PERF: Pre-allocate reusable vectors for hot-path math to avoid
// creating new p5.Vector objects every frame (major GC pressure source).
const _tmpVec = { x: 0, y: 0 };

var count = document.getElementById('count');

var showForces = false;
let checkbox = document.getElementById('showForces');
checkbox.addEventListener('change', () => {
  showForces = checkbox.checked;
});

let fps = document.getElementById('fps');

const controls = document.getElementById('controls');
const toggleBtn = document.getElementById('toggleControls');
toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // prevent bubbling if you make whole header clickable
  controls.classList.toggle('collapsed');
});

function setup() {
  let canvas = createCanvas(window.innerWidth, window.innerHeight);
  canvas.parent('simContainer');

  /*for (let i = 0; i < width / 5; i++) {
    let lipid = new Lipid(i * 5, height / 2 - 5);
    lipid.angle = radians(270);
    lipids.push(lipid);
    count.innerText = lipids.length;
  }
  for (let i = 0; i < width / 5; i++) {
    let lipid = new Lipid(i * 5, height / 2 + 5);
    lipid.angle = radians(90);
    lipids.push(lipid);
    count.innerText = lipids.length;
  }*/

  const r = height * 0.2;
  const bilayerCount = 200;
  for (let j = -1; j <= 1; j += 2) {
    console.log(j);
    for (let i = 0; i < bilayerCount; i++) {
      let angle = (i / bilayerCount) * Math.PI * 2;
      let outerLipid = new Lipid(
        Math.cos(angle) * r + width / 2 + j * 300,
        Math.sin(angle) * r + height / 2
      );
      outerLipid.angle = angle;
      lipids.push(outerLipid);

      let innerLipid = new Lipid(
        Math.cos(angle) * (r - 20) + width / 2 + j * 300,
        Math.sin(angle) * (r - 20) + height / 2
      );
      innerLipid.angle = angle - Math.PI;
      lipids.push(innerLipid);
    }
  }

  count.innerText = lipids.length;
  setupWater();
}

function draw() {
  background(220, 220, 220);
  fps.innerText = Math.round(frameRate());

  // --- PERF: Clear Map is faster than assigning a new object each frame,
  // as it reuses the internal hash table memory.
  grid.clear();

  if (mouseIsPressed && keyIsDown(SHIFT)) {
    createMolecule(drawMode);
  }

  for (let lipid of lipids) addToGrid(lipid);
  for (let aquaporin of aquaporins) addToGrid(aquaporin);

  hoverMolecule();
  updateMolecule('lipid');
  updateMolecule('aquaporin');
  updateWater();
  updateSodium();
  drawSodium();

  for (let [key, cell] of grid) {
    // Decode packed key back to col/row
    const col = Math.floor(key / GRID_OFFSET);
    const row = key - col * GRID_OFFSET;

    for (let obj of cell) {
      if (obj.type === 'water') continue;
      const molecule = obj;

      if (molecule.type === 'lipid') {
        forEachNeighbor(col, row, (other) => {
          if (other.type !== 'lipid') return; // <-- only lipids
          if (molecule.id >= other.id) return;

          //tailAttract(molecule, other);
          headTailRepel(molecule, other);
          headRepel(molecule, other);
          alignParallel(molecule, other);
          tailRepel(molecule, other);
        });
      }

      forEachNeighbor(col, row, (other) => {
        if (other.type === 'aquaporin') {
          aquaporinLipidRepel(other, molecule); // molecule may be lipid
        }
        if (other.type === 'sodium') {
          sodiumTailRepel(other, molecule);
        }
      });

      forEachNeighbor(col, row, (water) => {
        if (water.type === 'water' && water.vel) {
          if (molecule.type === 'lipid') {
            tailWaterRepel(molecule, water);
            headWaterAttract(molecule, water);
          }
          if (molecule.type === 'aquaporin') {
            const regions = Object.values(molecule.regions);
            for (let r of regions) {
              hydrophobicWaterRepel(molecule, r, water);
              hydrophilicWaterAttract(molecule, r, water);
            }
          }
          if (molecule.type === 'sodium') {
            sodiumWaterAttract(molecule, water.ref);
          }
        }
      });
    }
  }

  drawWater();
}

function mouseInsideCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function isMouseOverUI() {
  const uiElements = document.querySelectorAll(
    '#controls, #drawControls, #infoPanel'
  );
  for (let el of uiElements) {
    const rect = el.getBoundingClientRect();
    if (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    ) {
      return false; // mouse is over a UI element → ignore canvas input
    }
  }
  return true; // mouse is over canvas
}
