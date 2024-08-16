import { shuffle } from './util';

type Item = { position: Position; dimensions: Dimensions };
type CellIndex = [number, number];
type Position = [number, number];
type Dimensions = [number, number];

class SpaceGrid {
  numCells: number;
  gridSize: number;
  grid: Map<CellIndex, Item[]>;

  // Eg. new SpaceGrid(10, 50) creates a 10x10 grid with each cell being 5x5
  constructor(numCells: number, gridSize: number) {
    this.numCells = numCells;
    this.gridSize = gridSize;
    this.grid = new Map<CellIndex, Item[]>();
  }

  private getCellIndex(position: Position): CellIndex {
    // [0-1]
    const [x, y] = [position[0] / this.gridSize, position[1] / this.gridSize];
    // [0-9]
    return [Math.floor(x * this.numCells), Math.floor(y * this.numCells)];
  }

  insert(item: Item) {
    const [x, y] = item.position;
    const [w, h] = item.dimensions;

    // Get the cell index for the top left corner of the dimensions
    const [startX, startY] = this.getCellIndex([x - w / 2, y - h / 2]);
    // Get the cell index for the bottom right corner of the dimensions
    const [endX, endY] = this.getCellIndex([x + w / 2, y + h / 2]);

    for (let i = startX; i <= endX; i++) {
      for (let j = startY; j <= endY; j++) {
        // Insert item into each cell it overlaps
        const existingItems = this.grid.get([i, j]) || [];
        this.grid.set([i, j], [...existingItems, item]);
      }
    }
  }

  getNearby(item: Item): Item[] {
    const [x, y] = item.position;
    const [w, h] = item.dimensions;

    const [startX, startY] = this.getCellIndex([x - w / 2, y - h / 2]);
    const [endX, endY] = this.getCellIndex([x + w / 2, y + h / 2]);

    const nearby: Set<Item> = new Set();

    for (let i = startX; i <= endX; i++) {
      for (let j = startY; j <= endY; j++) {
        const items = this.grid.get([i, j]) || [];
        items.forEach((other) => nearby.add(other));
      }
    }

    return Array.from(nearby);
  }

  // Return a random point in the grid that has few (fewest?) items
  getLowPopulationPoint(): Position {
    let minSize = Infinity;
    // List of all cells with the fewest items
    let emptiestCells: CellIndex[] = [];

    // Note: the larger numCells is, the more likely it is that we find an empty cell
    for (let i = 0; i < this.numCells; i++) {
      for (let j = 0; j < this.numCells; j++) {
        const items = this.grid.get([i, j]) || [];
        const size = items.length;

        if (size < minSize) {
          minSize = size;
          emptiestCells = [[i, j]];
        } else if (size === minSize) {
          emptiestCells.push([i, j]);
        }
      }
    }

    const [i, j] = shuffle(emptiestCells)[0];
    // Get cell bounds
    const l = (i * this.gridSize) / this.numCells;
    const r = ((i + 1) * this.gridSize) / this.numCells;
    const t = (j * this.gridSize) / this.numCells;
    const b = ((j + 1) * this.gridSize) / this.numCells;

    return [l + Math.random() * (r - l), t + Math.random() * (b - t)];
  }
}

export default SpaceGrid;
