export class SceneVictory extends Phaser.Scene {
  constructor() {
    super('SceneVictory');
  }

  create() {
    // Play celebratory sound
    this.sound.play('menu', { volume: 0.7, detune: 400 });
    this.time.delayedCall(200, () => {
      this.sound.play('menu', { volume: 0.7, detune: 800 });
    });

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a2f1d, 0x0a2f1d, 0x010c05, 0x010c05, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle celebration particles
    this.particles = this.add.graphics();
    this.confetti = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      speed: 1 + Math.random() * 2,
      color: Phaser.Display.Color.RandomRGB(100, 255).color,
      size: 2 + Math.random() * 4
    }));

    // Title
    this.add.text(width / 2, height / 3, '¡VICTORIA!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '36px',
      color: '#48bb78',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 45, 'EL MUNDO HA SIDO SALVADO', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#cbd5e0',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 70, 'KAEL HA DERROTADO A LAS FUERZAS OSCURAS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#a0aec0'
    }).setOrigin(0.5);

    // Restart prompt
    const promptTxt = this.add.text(width / 2, height * 0.65, 'PRESIONA [ENTER] VOLVER AL MENÚ', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#ed8936'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: promptTxt,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  update() {
    // Animate falling confetti
    this.particles.clear();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.confetti.forEach(c => {
      c.y += c.speed;
      if (c.y > height + 10) {
        c.y = -10;
        c.x = Math.random() * width;
      }
      this.particles.fillStyle(c.color, 0.8);
      this.particles.fillRect(c.x, c.y, c.size, c.size);
    });

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.sound.play('menu', { volume: 0.5 });
      this.scene.start('SceneMenu');
    }
  }
}
