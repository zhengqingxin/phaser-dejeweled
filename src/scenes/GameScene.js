/**
 *
 * 1. 画球
 * 2. 选择球(pointerdown)
 *      - 首次单击选中 --> 放大
 *      - 二次单击选中
 *          - 相邻 --> 交换
 *          - 非相邻 --> 放大
 *
 * 3. 拖动球(pointermovie)
 *      - 交换
 *          - 满足消除条件 --> 消除 --> 重新排列
 *          - 不满足 --> 换回来
 * 4. 选择结束（pointerup）
 *
 * */
import Phaser from "phaser";
import gameConfig from "../config/game";

const MATCH_HORIZON = 1;
const MATCH_VERTICAL = 2;

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.gameArr = [];
    this.gemGroup = null;
    this.selectedGem = null;
    this.poolArr = [];
    this.destroyElements = [];
    this.dragging = false;
  }

  create() {
    this.drawGems();
    this.input.on("pointerdown", this.gemSelect.bind(this));

    this.input.on("pointermove", this.startSwipe.bind(this));
    this.input.on("pointerup", this.stopSwipe.bind(this));
  }

  startSwipe(pointer) {
    if (this.dragging) {
      const { x, y } = pointer;
      let row = Math.floor(y / gameConfig.gemSize);
      let col = Math.floor(x / gameConfig.gemSize);
      let gem = this.gemAt(row, col);
      if (this.areNext(gem, this.selectedGem)) {
        this.swapGems(gem, this.selectedGem);
      }
    }
  }

  stopSwipe() {
    this.dragging = false;
  }

  drawGems() {
    this.gemGroup = this.add.group();
    for (let i = 0; i < gameConfig.fieldSize; i++) {
      this.gameArr[i] = [];
      for (let j = 0; j < gameConfig.fieldSize; j++) {
        let gem = this.add.sprite(
          gameConfig.gemSize * j + gameConfig.gemSize / 2,
          gameConfig.gemSize * i + gameConfig.gemSize / 2,
          "gems"
        );
        this.gemGroup.add(gem);
        do {
          // 设置颜色：保证横纵两列不消除
          let randomColor = Phaser.Math.Between(0, gameConfig.gemNum - 1);
          gem.setFrame(randomColor);
          gem.gemColor = randomColor;
          this.gameArr[i][j] = gem;
        } while (this.isMatch(i, j));
      }
    }
  }

  gemSelect(e) {
    this.dragging = true;
    const { x, y } = e;
    let row = Math.floor(y / gameConfig.gemSize);
    let col = Math.floor(x / gameConfig.gemSize);
    let gem = this.gemAt(row, col);
    // 两次点击同一个元素
    if (this.selectedGem === gem) {
      gem.setScale(1);
      return;
    } else if (this.areNext(gem, this.selectedGem)) {
      // 点击旁边的元素，交换
      this.swapGems(gem, this.selectedGem);
    } else {
      if (this.selectedGem) {
        this.selectedGem.setScale(1);
      }
      gem.setScale(1.2);
      this.selectedGem = gem;
    }
  }

  swapGems(gem1, gem2, isReset = false) {
    const [row1, col1, row2, col2] = [
      this.getGemRow(gem1),
      this.getGemCol(gem1),
      this.getGemRow(gem2),
      this.getGemCol(gem2)
    ];
    // 位置交换
    gem1.setScale(1);
    gem2.setScale(1);
    this.tweenGem(gem1, gem2);
    this.tweenGem(gem2, gem1, () => {
      if (isReset) {
        return;
      }
      const matches = this.matchInBoard();
      if (matches.length > 0) {
        this.destroyGems(matches);
      } else {
        this.swapGems(gem2, gem1, true);
      }
    });
    // 数组交换
    this.gameArr[row1][col1] = gem2;
    this.gameArr[row2][col2] = gem1;
    this.selectedGem = null;
  }

  tweenGem(gem1, gem2, cb) {
    this.tweens.add({
      targets: gem1,
      x: gem2.x,
      y: gem2.y,
      ease: "Power1",
      duration: gameConfig.swapSpeed,
      callbackScope: this,
      onComplete: cb
    });
  }

  matchInBoard() {
    let arr = [];
    for (let i = 0; i < gameConfig.fieldSize; i++) {
      for (let j = 0; j < gameConfig.fieldSize; j++) {
        const match = this.isMatch(i, j);
        if (match) {
          arr.push({ row: i, col: j, direction: match });
        }
      }
    }
    return arr;
  }

  destroyGems(data = []) {
    console.log("matches");
    console.log(data);
    data.forEach(item => {
      if (item.direction === MATCH_HORIZON) {
        this.addToPool([
          { row: item.row, col: item.col },
          { row: item.row, col: item.col - 1 },
          { row: item.row, col: item.col - 2 }
        ]);
      } else {
        this.addToPool([
          { row: item.row, col: item.col },
          { row: item.row - 1, col: item.col },
          { row: item.row - 2, col: item.col }
        ]);
      }
    });
    this.tweens.add({
      targets: this.destroyElements,
      alpha: 0,
      duration: gameConfig.destroySpeed,
      onComplete: () => {
        // 新增元素，从上至下落下来
        this.destroyElements = [];
        this.poolArr = [];
        this.dropGems();
      }
    });
  }

  addToPool(arr) {
    arr.forEach(item => {
      let obj = this.poolArr.filter(
        o => o.row === item.row && o.col === item.col
      );
      if (obj.length === 0) {
        this.poolArr.push(item);
        this.destroyElements.push(this.gameArr[item.row][item.col]);
      }
    });
  }

  dropGems() {
    let col = 0;
    // 按列检查元素，将合法元素排列，指定新坐标
    while (col < gameConfig.fieldSize) {
      let newRow = gameConfig.fieldSize - 1;
      for (let row = gameConfig.fieldSize - 1; row >= 0; row--) {
        let ele = this.gameArr[row][col];
        if (ele.alpha !== 0) {
          this.gameArr[newRow][col] = ele;
          this.tweens.add({
            targets: ele,
            y: newRow * gameConfig.gemSize + gameConfig.gemSize / 2,
            duration: gameConfig.destroySpeed,
            onComplete: () => {
              const matches = this.matchInBoard();
              if (matches.length > 0) {
                this.destroyGems(matches);
              }
            }
          });
          newRow--;
        }
      }
      while (newRow >= 0) {
        // 补充元素
        let gem = this.add.sprite(
          gameConfig.gemSize * col + gameConfig.gemSize / 2,
          -gameConfig.gemSize * newRow + gameConfig.gemSize / 2,
          "gems"
        );
        this.gemGroup.add(gem);
        let randomColor = Phaser.Math.Between(0, gameConfig.gemNum - 1);
        gem.setFrame(randomColor);
        gem.gemColor = randomColor;
        this.gameArr[newRow][col] = gem;
        this.tweens.add({
          targets: gem,
          y: newRow * gameConfig.gemSize + gameConfig.gemSize / 2,
          duration: gameConfig.destroySpeed,
          onComplete: () => {
            const matches = this.matchInBoard();
            if (matches.length > 0) {
              this.destroyGems(matches);
            }
          }
        });
        newRow--;
      }
      col++;
    }
  }

  areNext(gem1, gem2) {
    if (!gem1 || !gem2) {
      return false;
    }
    return (
      Math.abs(this.getGemRow(gem1) - this.getGemRow(gem2)) +
        Math.abs(this.getGemCol(gem1) - this.getGemCol(gem2)) ==
      1
    );
  }

  getGemRow(gem) {
    return Math.floor(gem.y / gameConfig.gemSize);
  }

  getGemCol(gem) {
    return Math.floor(gem.x / gameConfig.gemSize);
  }

  isMatch(row, col) {
    if (this.isHorizonMatch(row, col)) {
      return MATCH_HORIZON;
    } else if (this.isVerticalMatch(row, col)) {
      return MATCH_VERTICAL;
    } else {
      return false;
    }
  }

  isHorizonMatch(row, col) {
    return (
      this.gemAt(row, col).gemColor === this.gemAt(row, col - 1).gemColor &&
      this.gemAt(row, col).gemColor === this.gemAt(row, col - 2).gemColor
    );
  }

  isVerticalMatch(row, col) {
    return (
      this.gemAt(row, col).gemColor === this.gemAt(row - 1, col).gemColor &&
      this.gemAt(row, col).gemColor === this.gemAt(row - 2, col).gemColor
    );
  }

  gemAt(row, col) {
    if (
      row < 0 ||
      row >= gameConfig.fieldSize ||
      col < 0 ||
      col >= gameConfig.fieldSize
    ) {
      return -1;
    }
    return this.gameArr[row][col];
  }
}

export default GameScene;
