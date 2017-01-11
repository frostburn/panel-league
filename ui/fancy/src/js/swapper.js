class Swapper {
  constructor(grid, x, y) {
    this.grid = grid;
    this.coordinates = { x, y };
  }

  get x() {
    return this.coordinates.x;
  }

  set x(x) {
    if (x >= 0 && x < this.grid.width - 1) {
      this.update({ x });
    }
  }

  get y() {
    return this.coordinates.y;
  }

  set y(y) {
    if (y >= 0 && y < this.grid.height) {
      this.update({ y });
    }
  }

  get blocks() {
    const { x, y } = this.coordinates;

    return [this.grid[y][x], this.grid[y][x + 1]];
  }

  update(coordinates) {
    const { x = this.coordinates.x, y = this.coordinates.y } = coordinates;

    this.blocks.forEach((block) => {
      block.isSwapper = false;
    });
    this.coordinates = { x, y };
    this.blocks.forEach((block) => {
      block.isSwapper = true;
    });
  }
}

module.exports = Swapper;
