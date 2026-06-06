export class SceneMenu extends Phaser.Scene {
  constructor() {
    super('SceneMenu');
  }

  preload() {
    // 1. Loading Visual Indicator
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'CARGANDO...',
      style: {
        font: '14px "Press Start 2P"',
        fill: '#ffffff'
      }
    }).setOrigin(0.5);

    const percentText = this.make.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        font: '10px "Press Start 2P"',
        fill: '#f6ad55'
      }
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      percentText.setText(parseInt(value * 100) + '%');
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      percentText.destroy();
    });

    // 2. Preload Tilemap assets
    this.load.image('tileset_img', 'assets/images/tileset.png');
    this.load.tilemapTiledJSON('level1_map', 'assets/tilemaps/nivel1.json');
    this.load.tilemapTiledJSON('level2_map', 'assets/tilemaps/nivel2.json');
    this.load.tilemapTiledJSON('level3_map', 'assets/tilemaps/nivel3.json');

    // 3. Preload Sprites
    this.load.image('bullet', 'assets/images/bullet.png');
    this.load.image('ammo_pistol', 'assets/images/ammo_pistol.png');
    this.load.image('ammo_shotgun', 'assets/images/ammo_shotgun.png');
    this.load.image('ammo_rifle', 'assets/images/ammo_rifle.png');

    // Player Spritesheets
    this.load.spritesheet('kael_walk', 'assets/images/kael/walk.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('kael_run', 'assets/images/kael/run.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('kael_attack', 'assets/images/kael/attack.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('kael_shoot', 'assets/images/kael/shoot.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('kael_change', 'assets/images/kael/change.png', { frameWidth: 25, frameHeight: 25 });

    // Enemy Spritesheets
    this.load.spritesheet('enemy1_walk', 'assets/images/enemy/enemy1_walk.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('enemy1_run', 'assets/images/enemy/enemy1_run.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('enemy1_died', 'assets/images/enemy/enemy1_died.png', { frameWidth: 25, frameHeight: 25 });

    this.load.spritesheet('enemy2_walk', 'assets/images/enemy/enemy2_walk.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('enemy2_run', 'assets/images/enemy/enemy2_run.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('enemy2_died', 'assets/images/enemy/enemy2_died.png', { frameWidth: 25, frameHeight: 25 });

    this.load.spritesheet('enemy3_walk', 'assets/images/enemy/enemy3_walk.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('enemy3_run', 'assets/images/enemy/enemy3_run.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('enemy3_died', 'assets/images/enemy/enemy3_died.png', { frameWidth: 25, frameHeight: 25 });

    this.load.spritesheet('boss_walk', 'assets/images/enemy/boss_walk.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('boss_run', 'assets/images/enemy/boss_run.png', { frameWidth: 25, frameHeight: 25 });
    this.load.spritesheet('boss_died', 'assets/images/enemy/boss_died.png', { frameWidth: 25, frameHeight: 25 });

    // 4. Preload Audio
    this.load.audio('menu', 'assets/audio/menu.wav');
    this.load.audio('dano_recibido', 'assets/audio/dano_recibido.wav');
    this.load.audio('muerte_jugador', 'assets/audio/muerte_jugador.wav');
    this.load.audio('game_over', 'assets/audio/game_over.wav');
    this.load.audio('ambient_loop', 'assets/audio/dry-thunder-ambient.wav');
    this.load.audio('disparo_arma', 'assets/audio/disparo_arma.wav');
  }

  create() {
    // Play Menu Sound once
    this.sound.play('ambient_loop', { volume: 0.5 })
    this.sound.play('menu', { volume: 0.5 });

    // Register Animations
    const charTypes = ['kael', 'enemy1', 'enemy2', 'enemy3', 'boss'];
    charTypes.forEach((type) => {
      // Walk
      if (!this.anims.exists(`${type}_walk`)) {
        this.anims.create({
          key: `${type}_walk`,
          frames: this.anims.generateFrameNumbers(`${type}_walk`, { start: 0, end: 4 }),
          frameRate: 6,
          repeat: -1
        });
      }
      // Run
      if (!this.anims.exists(`${type}_run`)) {
        this.anims.create({
          key: `${type}_run`,
          frames: this.anims.generateFrameNumbers(`${type}_run`, { start: 0, end: 4 }),
          frameRate: 10,
          repeat: -1
        });
      }
      // Died (for Kael we don't have separate died sheet, we use enemies' died sheets)
      if (type !== 'kael' && !this.anims.exists(`${type}_died`)) {
        this.anims.create({
          key: `${type}_died`,
          frames: this.anims.generateFrameNumbers(`${type}_died`, { start: 0, end: 4 }),
          frameRate: 5,
          repeat: 0
        });
      }
    });

    // Special Player Actions
    const actionTypes = ['attack', 'shoot', 'change'];
    actionTypes.forEach((action) => {
      if (!this.anims.exists(`kael_${action}`)) {
        this.anims.create({
          key: `kael_${action}`,
          frames: this.anims.generateFrameNumbers(`kael_${action}`, { start: 0, end: 4 }),
          frameRate: 12,
          repeat: -1
        });
      }
    });

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Drawing nice background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0f30, 0x1a0f30, 0x05020c, 0x05020c, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle floating dust particles in menu
    this.particles = this.add.graphics();
    this.dust = Array.from({ length: 25 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.2 + Math.random() * 0.5,
      size: 1 + Math.random() * 2
    }));

    // 2. Title
    this.add.text(width / 2, height / 3, 'PIX', {
      fontFamily: '"Press Start 2P"',
      fontSize: '44px',
      color: '#f6ad55',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 45, 'SLAYER', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#cbd5e0',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    // 3. Play Prompt
    const playPrompt = this.add.text(width / 2, height * 0.6, 'PRESIONA ENTER PARA JUGAR', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: '#4fd1c5',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: playPrompt,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    // 4. Instructions Panel
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x000000, 0.6);
    infoBg.lineStyle(2, 0x4a5568, 1);
    infoBg.fillRoundedRect(width / 2 - 200, height * 0.72, 400, 100, 8);
    infoBg.strokeRoundedRect(width / 2 - 200, height * 0.72, 400, 100, 8);

    const controlsText = [
      'WASD / FLECHAS - Moverse',
      'RATÓN - Apuntar y Disparar [Click]',
      '1, 2, 3 - Cambiar Armar',
      'R - Recargar cargador vacío'
    ];

    controlsText.forEach((txt, idx) => {
      this.add.text(width / 2 - 180, height * 0.75 + (idx * 20), txt, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#cbd5e0'
      });
    });

    // 5. Input key mapping
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  update() {
    // Animate menu particles
    this.particles.clear();
    this.particles.fillStyle(0xa0aec0, 0.4);
    this.dust.forEach(p => {
      p.y -= p.speed;
      if (p.y < -10) p.y = this.cameras.main.height + 10;
      this.particles.fillRect(p.x, p.y, p.size, p.size);
    });

    // Trigger game start
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.sound.play('menu', { volume: 0.7, detune: 200 });
      this.scene.start('SceneNivel1');
    }
  }
}
