import "phaser";
import gameConfig from "./config/game";
import BootScene from "./scenes/BootScene";
import GameScene from "./scenes/GameScene";

const config = {
  type: Phaser.AUTO,
  parent: "content",
  width: gameConfig.canvasWidth,
  height: gameConfig.canvasHeight,
  scene: [BootScene, GameScene]
};

new Phaser.Game(config); // eslint-disable-line no-unused-vars
