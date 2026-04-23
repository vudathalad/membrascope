function getCellKey(x, y) {
  // --- PERF: Return an integer key (col * OFFSET + row) instead of a string.
  // Avoids string allocation on every grid insert/lookup (called ~5000+/frame).
  const col = Math.floor(x / GRID_SIZE);
  const row = Math.floor(y / GRID_SIZE);
  return col * GRID_OFFSET + row;
}

function addToGrid(lipid) {
  const key = getCellKey(lipid.pos.x, lipid.pos.y);
  let cell = grid.get(key);
  if (!cell) {
    cell = [];
    grid.set(key, cell);
  }
  cell.push(lipid);
}

function forEachNeighbor(col, row, callback) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = grid.get((col + dx) * GRID_OFFSET + (row + dy));
      if (!cell) continue;
      for (let other of cell) {
        callback(other);
      }
    }
  }
}
