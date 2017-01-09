class Swapper {
  constructor(userInterface, x, y) {
    this.userInterface = userInterface;
    this.coordinates = { x, y };
  }

  get x() {
    return this.coordinates.x;
  }

  set x(x) {
    if (x < 0 || x >= this.userInterface.game.width - 1) {
      return;
    }
    this.update({ x });
  }

  get y() {
    return this.coordinates.y;
  }

  set y(y) {
    if (y < 0 || y >= this.userInterface.game.height) {
      return;
    }
    this.update({ y });
  }

  get blockElements() {
    const { x, y } = this.coordinates;
    const index = x + (y * this.userInterface.game.width);

    return [this.userInterface.blocks[index], this.userInterface.blocks[index + 1]];
  }

  update(coordinates) {
    const { x = this.coordinates.x, y = this.coordinates.y } = coordinates;

    this.blockElements.forEach((element) => {
      element.classList.remove('swapper');
    });
    this.coordinates = { x, y };
    this.blockElements.forEach((element) => {
      element.classList.add('swapper');
    });
  }
}

module.exports = Swapper;
