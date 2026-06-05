export class SceneGameOver extends Phaser.Scene {
  constructor() {
    super('SceneGameOver');
  }

  init(data) {
    this.failedLevelKey = data.levelKey;
    this.savedWeapons = data.weapons;
  }

  create() {
    // Play Game Over Sound once
    this.sound.play('game_over', { volume: 0.6 });

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw background overlay
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x200505, 0x200505, 0x050000, 0x050000, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, height / 3, 'FIN DE LA PARTIDA', {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 40, 'HAS CAÍDO EN COMBATE', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#cbd5e0'
    }).setOrigin(0.5);

    // Actions
    const retryTxt = this.add.text(width / 2, height * 0.6, 'PRESIONA [ENTER] PARA REINTENTAR', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#4fd1c5'
    }).setOrigin(0.5);

    const menuTxt = this.add.text(width / 2, height * 0.67, 'PRESIONA [ESC] PARA VOLVER AL MENÚ', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#a0aec0'
    }).setOrigin(0.5);

    // Blinking effect
    this.tweens.add({
      targets: [retryTxt],
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Key bindings
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.sound.play('menu', { volume: 0.5 });
      // Restart the failed level with fresh health
      this.scene.start(this.failedLevelKey, {
        playerHealth: 100,
        weapons: this.savedWeapons
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.sound.play('menu', { volume: 0.5 });
      this.scene.start('SceneMenu');
    }
  }
}
