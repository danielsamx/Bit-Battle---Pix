import { BaseNivel } from './base_nivel.js';

export class SceneNivel3 extends BaseNivel {
  constructor() {
    super('SceneNivel3', 'NIVEL 3: EL ALTAR OSCURO', 'SceneVictory', 'level3_map');
  }

  levelSetup() {
    // All weapons unlocked
    this.weapons[1].unlocked = true;
    this.weapons[2].unlocked = true;
    this.weapons[3].unlocked = true;

    // Equip assault rifle by default
    this.currentWeaponId = 3;

    // Boss attack timer initialization
    this.nextBossAttackTime = this.time.now + 3000;
    this.bossAttackState = 0; // 0: Idle/moving, 1: Spells

    // Create group for boss bullets
    this.bossBullets = this.physics.add.group();
    this.physics.add.collider(this.bossBullets, this.wallsLayer, (bullet) => {
      bullet.destroy();
    });
    this.physics.add.overlap(this.player, this.bossBullets, (player, bullet) => {
      this.damagePlayer(bullet.damage);
      bullet.destroy();
    });

    // Spawn regular enemies
    const basicSpawnPoints = [
      { x: 200, y: 200 },
      { x: 600, y: 200 },
      { x: 200, y: 600 },
      { x: 600, y: 600 }
    ];

    const fastSpawnPoints = [
      { x: 150, y: 400 },
      { x: 650, y: 400 }
    ];

    const tankSpawnPoints = [
      { x: 400, y: 150 },
      { x: 400, y: 650 }
    ];

    basicSpawnPoints.forEach(pt => {
      this.spawnEnemy(pt.x, pt.y, 'enemy1', 50, 60, 15);
    });

    fastSpawnPoints.forEach(pt => {
      this.spawnEnemy(pt.x, pt.y, 'enemy2', 90, 35, 20);
    });

    tankSpawnPoints.forEach(pt => {
      this.spawnEnemy(pt.x, pt.y, 'enemy3', 35, 120, 30);
    });

    // Spawn Boss in the center
    const centerX = this.map.widthInPixels / 2;
    const centerY = this.map.heightInPixels / 2;
    
    // type, speed, health, damageSpeed
    this.boss = this.spawnEnemy(centerX, centerY, 'boss', 35, 450, 40);
    this.boss.setScale(2.5); // make him massive
    this.boss.body.setSize(22, 22);
    
    // Custom label for the Boss
    this.bossLabel = this.add.text(this.boss.x, this.boss.y - 35, 'DESTRUCTOR KAEL-X', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.boss && this.boss.active && !this.boss.isDead) {
      // Keep label aligned above boss
      this.bossLabel.x = this.boss.x;
      this.bossLabel.y = this.boss.y - 35;

      // Handle boss attack patterns
      if (time > this.nextBossAttackTime) {
        this.nextBossAttackTime = time + 2500;
        this.triggerBossAttack();
      }
    } else if (this.bossLabel) {
      // Destroy label if boss is dead
      this.bossLabel.destroy();
      this.bossLabel = null;
    }
  }

  triggerBossAttack() {
    if (this.playerHealth <= 0) return;

    // alternate attacks
    this.bossAttackState = (this.bossAttackState + 1) % 2;

    if (this.bossAttackState === 0) {
      // Pattern 1: Fire ring of 8 bullets
      this.showFloatingText(this.boss.x, this.boss.y - 50, '¡EXPLOSIÓN ÍGNEA!', '#ff7700');
      this.sound.play('disparo_arma', { volume: 0.5, detune: -600 });
      
      const numBullets = 8;
      for (let i = 0; i < numBullets; i++) {
        const angle = (i * Math.PI * 2) / numBullets;
        this.createBossBullet(this.boss.x, this.boss.y, angle, 15, 200);
      }
    } else {
      // Pattern 2: Triple burst at Player
      this.showFloatingText(this.boss.x, this.boss.y - 50, '¡RÁFAGA FOCALIZADA!', '#ff0055');
      
      let delay = 0;
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(delay, () => {
          if (!this.boss || this.boss.isDead || this.playerHealth <= 0) return;
          
          this.sound.play('disparo_arma', { volume: 0.5, detune: -400 });
          const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
          this.createBossBullet(this.boss.x, this.boss.y, angle, 12, 280);
        });
        delay += 200;
      }
    }
  }

  createBossBullet(x, y, angle, damage, speed) {
    const bullet = this.bossBullets.create(x, y, 'bullet');
    bullet.setTint(0xff5500); // orange enemy fire
    bullet.setScale(1.5);
    bullet.damage = damage;
    bullet.setRotation(angle);
    
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    bullet.body.setVelocity(vx, vy);

    this.time.delayedCall(2500, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }
}
