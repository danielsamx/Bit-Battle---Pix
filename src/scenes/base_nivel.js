export class BaseNivel extends Phaser.Scene {
  constructor(key, levelName, nextLevelKey, mapKey) {
    super(key);
    this.levelName = levelName;
    this.nextLevelKey = nextLevelKey;
    this.mapKey = mapKey;
  }

  init(data) {
    // Retain stats between levels
    this.playerHealth = data.playerHealth !== undefined ? data.playerHealth : 100;
    this.maxHealth = 100;
    
    // Weapon stats structure
    this.weapons = data.weapons || {
      1: { name: 'Pistola', unlocked: true, damage: 15, fireRate: 350, clipSize: 10, clipAmmo: 10, reserveAmmo: 50, maxReserve: 100, bulletSpeed: 450, sound: 'shoot' },
      2: { name: 'Escopeta', unlocked: false, damage: 10, fireRate: 800, clipSize: 6, clipAmmo: 6, reserveAmmo: 24, maxReserve: 48, bulletSpeed: 400, sound: 'shoot' },
      3: { name: 'Fusil', unlocked: false, damage: 20, fireRate: 130, clipSize: 30, clipAmmo: 30, reserveAmmo: 90, maxReserve: 180, bulletSpeed: 500, sound: 'shoot' }
    };
    
    this.currentWeaponId = data.currentWeaponId !== undefined ? data.currentWeaponId : 1;
    this.isReloading = false;
    this.reloadTimer = null;
    this.lastFired = 0;
    this.enemiesRemaining = 0;
    this.portalActive = false;
  }

  create() {
    // 1. Create Tilemap
    this.map = this.make.tilemap({ key: this.mapKey });
    const tileset = this.map.addTilesetImage('tileset', 'tileset_img');
    
    this.floorLayer = this.map.createLayer('Floor', tileset, 0, 0);
    this.wallsLayer = this.map.createLayer('Walls', tileset, 0, 0);
    
    // Collisions
    this.wallsLayer.setCollisionByProperty({ collides: true });
    // Or set collision by tile IDs: Wall is ID 2, Obstacle is ID 3
    this.wallsLayer.setCollision([2, 3]);

    // 2. Setup Player (Kael)
    // Find player spawn point or default to 100, 100
    let spawnX = 120;
    let spawnY = 120;
    
    this.player = this.physics.add.sprite(spawnX, spawnY, 'kael_walk', 0);
    this.player.setOrigin(0.5, 0.5);
    this.player.setSize(18, 18); // tighter hitbox
    this.player.setCollideWorldBounds(true);
    
    // Collide player with walls
    this.physics.add.collider(this.player, this.wallsLayer);

    // 3. Setup Camera
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5); // Zoom in for details

    // 4. Setup Input Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      reload: Phaser.Input.Keyboard.KeyCodes.R,
      weapon1: Phaser.Input.Keyboard.KeyCodes.ONE,
      weapon2: Phaser.Input.Keyboard.KeyCodes.TWO,
      weapon3: Phaser.Input.Keyboard.KeyCodes.THREE
    });

    // 5. Groups
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 100
    });
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    // 6. Physics Colliders
    this.physics.add.collider(this.enemies, this.wallsLayer);
    this.physics.add.collider(this.enemies, this.enemies); // Enemies bump into each other

    // Bullet vs Wall
    this.physics.add.collider(this.bullets, this.wallsLayer, (bullet) => {
      bullet.destroy();
    });

    // Bullet vs Enemy
    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      if (enemy.isDead) return;
      this.damageEnemy(enemy, bullet.damage);
      bullet.destroy();
    });

    // Player vs Enemy
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      if (enemy.isDead) return;
      this.damagePlayer(enemy.damageSpeed * this.game.loop.delta / 1000);
    });

    // Player vs Pickups
    this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
      this.collectPickup(pickup);
    });

    // 7. Ambient Audio
    if (this.sound.get('ambient_loop')) {
      if (!this.sound.get('ambient_loop').isPlaying) {
        this.sound.play('ambient_loop', { loop: true, volume: 0.3 });
      }
    } else {
      this.sound.play('ambient_loop', { loop: true, volume: 0.3 });
    }

    // 8. Launch UI scene overlay
    if (!this.scene.isActive('SceneUI')) {
      this.scene.run('SceneUI', { levelScene: this });
    } else {
      this.scene.get('SceneUI').setLevelScene(this);
    }

    // 9. Level Custom Setup (spawning enemies etc. defined in children)
    this.levelSetup();

    // Show initial banner
    this.time.delayedCall(500, () => {
      this.showLevelBanner();
    });
  }

  showLevelBanner() {
    const text = this.add.text(this.player.x, this.player.y - 80, this.levelName, {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: '#f6ad55',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: this.player.y - 120,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  update(time, delta) {
    if (this.playerHealth <= 0) return;

    // 1. Player movement logic
    let vx = 0;
    let vy = 0;
    const speed = 120;

    if (this.keys.left.isDown || this.cursors.left.isDown) vx = -speed;
    else if (this.keys.right.isDown || this.cursors.right.isDown) vx = speed;

    if (this.keys.up.isDown || this.cursors.up.isDown) vy = -speed;
    else if (this.keys.down.isDown || this.cursors.down.isDown) vy = speed;

    // Diagonal speed normalization
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.setVelocity(vx, vy);

    // 2. Play animations based on movement & actions
    const currentWeapon = this.weapons[this.currentWeaponId];
    if (vx !== 0 || vy !== 0) {
      if (this.input.activePointer.isDown) {
        this.player.play('kael_shoot', true);
      } else {
        this.player.play('kael_run', true);
      }
    } else {
      if (this.input.activePointer.isDown) {
        this.player.play('kael_shoot', true);
      } else {
        this.player.play('kael_walk', true);
      }
    }

    // 3. Rotate Player to face mouse pointer
    const pointer = this.input.activePointer;
    // We need to translate pointer coordinates from screen space to world space because of camera scroll/zoom
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
    this.player.setRotation(angle);

    // 4. Keyboard Weapon switching
    if (Phaser.Input.Keyboard.JustDown(this.keys.weapon1)) this.switchWeapon(1);
    else if (Phaser.Input.Keyboard.JustDown(this.keys.weapon2)) this.switchWeapon(2);
    else if (Phaser.Input.Keyboard.JustDown(this.keys.weapon3)) this.switchWeapon(3);

    // 5. Reload trigger
    if (Phaser.Input.Keyboard.JustDown(this.keys.reload)) {
      this.reloadWeapon();
    }

    // 6. Shooting execution
    if (pointer.isDown && time > this.lastFired) {
      this.fireWeapon(worldPoint, time);
    }

    // 7. Enemy AI (chase player)
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.isDead) return;
      
      // Face the player
      const enemyAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      enemy.setRotation(enemyAngle);
      
      // Move towards player
      this.physics.moveToObject(enemy, this.player, enemy.speed);
      enemy.play(`${enemy.enemyType}_run`, true);

      // Keep health bar aligned above enemy
      enemy.healthBar.x = enemy.x - 12;
      enemy.healthBar.y = enemy.y - 20;
    });

    // 8. Exit portal checker
    if (this.portalActive) {
      // Check distance to portal tile location
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portalX, this.portalY);
      if (dist < 24) {
        this.advanceLevel();
      }
    }
  }

  switchWeapon(id) {
    if (id === this.currentWeaponId || this.isReloading) return;
    
    if (this.weapons[id] && this.weapons[id].unlocked) {
      this.currentWeaponId = id;
      this.sound.play('menu', { volume: 0.5 });
      
      // Trigger short weapon change animation on player
      this.player.play('kael_change', true);
      
      // Flash floating text
      this.showFloatingText(this.player.x, this.player.y - 30, `Equipado: ${this.weapons[id].name}`, '#63b3ed');
      
      // Update UI
      this.events.emit('weapon-changed');
    } else {
      this.showFloatingText(this.player.x, this.player.y - 30, '¡Bloqueada!', '#e53e3e');
    }
  }

  fireWeapon(targetPoint, time) {
    if (this.isReloading) return;

    const currentWeapon = this.weapons[this.currentWeaponId];
    if (currentWeapon.clipAmmo <= 0) {
      // Out of ammo, reload automatically or show warning
      this.showFloatingText(this.player.x, this.player.y - 30, '¡SIN MUNICIÓN! [R]', '#fc8181');
      this.lastFired = time + 500; // brief delay
      return;
    }

    this.lastFired = time + currentWeapon.fireRate;
    currentWeapon.clipAmmo--;

    // Play shoot sound
    this.sound.play('disparo_arma', { volume: 0.4 });

    // Cameras shake based on weapon
    if (this.currentWeaponId === 2) {
      this.cameras.main.shake(100, 0.005); // heavy recoil for shotgun
    } else {
      this.cameras.main.shake(50, 0.002);  // light recoil
    }

    // Spawn bullets
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetPoint.x, targetPoint.y);

    if (this.currentWeaponId === 2) {
      // Shotgun spread: 5 bullets in fan
      const spread = 0.25; // radians spread
      for (let i = 0; i < 5; i++) {
        const dev = (i - 2) * (spread / 2);
        this.createBullet(angle + dev, currentWeapon.damage, currentWeapon.bulletSpeed);
      }
    } else {
      // Pistol & Rifle: single shot
      this.createBullet(angle, currentWeapon.damage, currentWeapon.bulletSpeed);
    }

    // Emit event to update HUD
    this.events.emit('ammo-updated');
  }

  createBullet(angle, damage, speed) {
    // Spawn bullet offset from player body
    const spawnDistance = 15;
    const bx = this.player.x + Math.cos(angle) * spawnDistance;
    const by = this.player.y + Math.sin(angle) * spawnDistance;

    const bullet = this.bullets.get(bx, by);
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.body.enable = true;
      bullet.damage = damage;
      bullet.setRotation(angle);
      
      // Calculate velocity components
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      bullet.body.setVelocity(vx, vy);

      // Destroy bullet after 1.5 seconds if it doesn't hit anything
      this.time.delayedCall(1500, () => {
        if (bullet.active) {
          bullet.destroy();
        }
      });
    }
  }

  reloadWeapon() {
    const currentWeapon = this.weapons[this.currentWeaponId];
    if (this.isReloading || currentWeapon.clipAmmo === currentWeapon.clipSize || currentWeapon.reserveAmmo <= 0) {
      return;
    }

    this.isReloading = true;
    this.sound.play('menu', { volume: 0.4, detune: -400 }); // Low pitch sound for reload start
    this.showFloatingText(this.player.x, this.player.y - 30, 'Recargando...', '#fc8181');

    // Notify UI
    this.events.emit('reload-start');

    this.reloadTimer = this.time.delayedCall(1200, () => {
      const needed = currentWeapon.clipSize - currentWeapon.clipAmmo;
      const transferred = Math.min(needed, currentWeapon.reserveAmmo);
      
      currentWeapon.clipAmmo += transferred;
      currentWeapon.reserveAmmo -= transferred;

      this.isReloading = false;
      this.sound.play('menu', { volume: 0.5 }); // reload finish chime
      
      // Notify UI
      this.events.emit('reload-complete');
    });
  }

  damagePlayer(amount) {
    if (this.playerHealth <= 0) return;

    this.playerHealth = Math.max(0, this.playerHealth - amount);
    
    // Visual flash red
    this.player.setTint(0xff5555);
    this.time.delayedCall(100, () => {
      if (this.player) this.player.clearTint();
    });

    // Play damage sound (with debounce)
    if (!this.lastDamageSoundTime || this.time.now - this.lastDamageSoundTime > 300) {
      this.sound.play('dano_recibido', { volume: 0.5 });
      this.lastDamageSoundTime = this.time.now;
      this.cameras.main.shake(100, 0.01);
    }

    // Notify UI
    this.events.emit('health-updated');

    if (this.playerHealth <= 0) {
      this.handlePlayerDeath();
    }
  }

  damageEnemy(enemy, damage) {
    enemy.health = Math.max(0, enemy.health - damage);
    
    // Red flash
    enemy.setTint(0xff3333);
    this.time.delayedCall(80, () => {
      if (enemy.active) enemy.clearTint();
    });

    // Damage numbers
    this.showFloatingText(enemy.x, enemy.y - 15, `-${Math.round(damage)}`, '#ff5555');

    // Update health bar
    this.drawEnemyHealthBar(enemy);

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  drawEnemyHealthBar(enemy) {
    const bar = enemy.healthBar;
    bar.clear();
    
    // Background (Black outline)
    bar.fillStyle(0x000000, 0.7);
    bar.fillRect(0, 0, 24, 4);

    // Health color (Green for high, Yellow for mid, Red for low)
    const pct = enemy.health / enemy.maxHealth;
    let color = 0x22c55e;
    if (pct < 0.3) color = 0xef4444;
    else if (pct < 0.6) color = 0xeab308;

    bar.fillStyle(color, 1);
    bar.fillRect(1, 1, Math.max(0, 22 * pct), 2);
  }

  killEnemy(enemy) {
    enemy.isDead = true;
    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    enemy.healthBar.destroy();

    // Play death anim
    enemy.play(`${enemy.enemyType}_died`, true);
    this.sound.play('dano_recibido', { volume: 0.6, detune: -500 }); // deeper crunch for death

    // Handle score / progress
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
    
    // Spawn ammo drops
    this.rollAmmoDrop(enemy.x, enemy.y);

    // After animation finishes, keep corpse or fade out
    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          enemy.destroy();
        }
      });
    });

    // Check if level clear
    if (this.enemiesRemaining === 0) {
      this.activateExitPortal();
    }
  }

  rollAmmoDrop(x, y) {
    // 40% chance of ammo drop
    if (Math.random() > 0.4) return;

    // Pick from unlocked weapons
    const unlockedIds = Object.keys(this.weapons).filter(id => this.weapons[id].unlocked);
    const randomWeaponId = parseInt(unlockedIds[Math.floor(Math.random() * unlockedIds.length)]);

    // Determine ammo quantity based on weapon
    let amount = 5;
    let spriteName = 'ammo_pistol';
    if (randomWeaponId === 2) {
      amount = 4;
      spriteName = 'ammo_shotgun';
    } else if (randomWeaponId === 3) {
      amount = 20;
      spriteName = 'ammo_rifle';
    }

    const pickup = this.pickups.create(x, y, spriteName);
    pickup.weaponId = randomWeaponId;
    pickup.amount = amount;
    
    // Bounce animation
    pickup.y -= 5;
    this.tweens.add({
      targets: pickup,
      y: pickup.y + 10,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut'
    });
  }

  collectPickup(pickup) {
    const wId = pickup.weaponId;
    const weapon = this.weapons[wId];
    
    if (weapon.reserveAmmo >= weapon.maxReserve) {
      this.showFloatingText(this.player.x, this.player.y - 30, `¡Lleno: ${weapon.name}!`, '#718096');
      pickup.destroy();
      return;
    }

    weapon.reserveAmmo = Math.min(weapon.maxReserve, weapon.reserveAmmo + pickup.amount);
    
    // Play pick sound
    this.sound.play('menu', { volume: 0.6, detune: 200 }); // higher chime
    this.showFloatingText(this.player.x, this.player.y - 30, `+${pickup.amount} Balas de ${weapon.name}`, '#48bb78');

    pickup.destroy();
    
    // Notify UI
    this.events.emit('ammo-updated');
  }

  activateExitPortal() {
    this.portalActive = true;
    
    // Find exit portal coordinates in the tilemap layer (ID 4)
    let foundPortal = false;
    this.floorLayer.forEachTile((tile) => {
      if (tile.index === 4) { // Gold Exit Portal
        this.portalX = tile.pixelX + 16;
        this.portalY = tile.pixelY + 16;
        foundPortal = true;
      }
    });

    if (!foundPortal) {
      // Spawn portal in center if not found in tilemap
      this.portalX = this.map.widthInPixels / 2;
      this.portalY = this.map.heightInPixels / 2;
    }

    // Visual effect at portal location
    const portalFX = this.add.sprite(this.portalX, this.portalY, 'tileset_img', 3); // Frame 3 is gold portal
    portalFX.setScale(1.5);
    portalFX.setAlpha(0);
    this.tweens.add({
      targets: portalFX,
      alpha: 1,
      scaleX: 2.0,
      scaleY: 2.0,
      duration: 1000,
      ease: 'Elastic'
    });

    // Notify player
    this.showFloatingText(this.player.x, this.player.y - 60, '¡PORTAL ACTIVADO! CRÚZALO', '#ed8936');
    this.sound.play('menu', { volume: 0.7, detune: 500 });
  }

  advanceLevel() {
    // Stop loops
    if (this.sound.get('ambient_loop')) {
      this.sound.get('ambient_loop').stop();
    }

    // Stop HUD
    this.scene.stop('SceneUI');

    // If nextLevelKey is 'SceneVictory', we unlock or complete the game
    // Otherwise, we unlock the level's respective new weapon!
    if (this.key === 'SceneNivel1') {
      this.weapons[2].unlocked = true; // Unlock shotgun
    } else if (this.key === 'SceneNivel2') {
      this.weapons[3].unlocked = true; // Unlock rifle
    }

    this.scene.start(this.nextLevelKey, {
      playerHealth: this.playerHealth,
      weapons: this.weapons,
      currentWeaponId: this.currentWeaponId
    });
  }

  handlePlayerDeath() {
    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);
    this.physics.world.disable(this.player);

    if (this.sound.get('ambient_loop')) {
      this.sound.get('ambient_loop').stop();
    }
    this.sound.play('muerte_jugador', { volume: 0.8 });

    // Stop HUD
    this.scene.stop('SceneUI');

    // Trigger Game Over scene
    this.time.delayedCall(2000, () => {
      this.scene.start('SceneGameOver', {
        levelKey: this.scene.key,
        weapons: this.weapons
      });
    });
  }

  showFloatingText(x, y, text, color) {
    const fText = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: color,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
      targets: fText,
      y: y - 25,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        fText.destroy();
      }
    });
  }

  spawnEnemy(x, y, type, speed, health, damageSpeed) {
    const enemy = this.enemies.create(x, y, `${type}_walk`, 0);
    enemy.enemyType = type;
    enemy.speed = speed;
    enemy.health = health;
    enemy.maxHealth = health;
    enemy.damageSpeed = damageSpeed;
    enemy.isDead = false;
    
    enemy.setOrigin(0.5, 0.5);
    enemy.setSize(18, 18);
    enemy.setCollideWorldBounds(true);

    // Create enemy health bar graphics
    enemy.healthBar = this.add.graphics();
    this.drawEnemyHealthBar(enemy);

    this.enemiesRemaining++;
    return enemy;
  }
}
