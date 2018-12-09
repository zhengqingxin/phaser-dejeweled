class BootScene extends Phaser.Scene {
  constructor(test) {
    super({
      key: "BootScene"
    });
  }
  preload() {
    const progress = this.add.graphics();
    this.load.on("progress", value => {
      progress.clear();
      progress.fillStyle(0xffffff, 1);
      progress.fillRect(
        0,
        this.sys.game.config.height / 2,
        this.sys.game.config.width * value,
        60
      );
    });
    this.load.on("complete", () => {
      console.log("加载完成");
      this.scene.start("GameScene");
    });
    this.load.spritesheet("gems", "assets/images/gems.png", {
      frameWidth: 100,
      frameHeight: 100
    });
  }
}

export default BootScene;
