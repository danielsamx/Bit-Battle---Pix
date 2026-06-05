export class SceneUI extends Phaser.Scene {
  constructor() {
    super('SceneUI');
  }

  init(data) {
    this.levelScene = data.levelScene;
  }

  setLevelScene(scene) {
    this.levelScene = scene;
    this.setupListeners();
    this.drawUI();
  }

  create() {
    if (this.levelScene) {
      this.setupListeners();
      this.drawUI();
    }
  }

  setupListeners() {
    // Unbind any previous listeners
    if (this.levelScene) {
      this.levelScene.events.off('ammo-updated', this.updateAmmo, this);
      this.levelScene.events.off('health-updated', this.updateHealth, this);
      this.levelScene.events.off('weapon-changed', this.updateWeapon, this);
      this.levelScene.events.off('reload-start', this.showReloading, this);
      this.levelScene.events.off('reload-complete', this.hideReloading, this);

      // Bind new listeners
      this.levelScene.events.on('ammo-updated', this.updateAmmo, this);
      this.levelScene.events.on('health-updated', this.updateHealth, this);
      this.levelScene.events.on('weapon-changed', this.updateWeapon, this);
      this.levelScene.events.on('reload-start', this.showReloading, this);
      this.levelScene.events.on('reload-complete', this.hideReloading, this);
    }
  }

  drawUI() {
    // Clear previous UI if redrawing
    if (this.uiGraphics) this.uiGraphics.destroy();
    if (this.hpText) this.hpText.destroy();
    if (this.ammoText) this.ammoText.destroy();
    if (this.reloadText) this.reloadText.destroy();
    if (this.levelNameText) this.levelNameText.destroy();
    if (this.inventoryTexts) {
      this.inventoryTexts.forEach(t => t.destroy());
    }

    this.uiGraphics = this.add.graphics();
    this.inventoryTexts = [];

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Draw Level Title at Top Center
    this.levelNameText = this.add.text(width / 2, 20, this.levelScene.levelName.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#a0aec0',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // 2. Health HUD (Top Left)
    this.hpText = this.add.text(20, 20, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#ffffff'
    });
    this.updateHealth();

    // 3. Ammo HUD (Bottom Right)
    this.ammoText = this.add.text(width - 250, height - 30, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: '#ffffff',
      align: 'right'
    }).setOrigin(0, 0);
    this.updateAmmo();

    // 4. Reload Flashing Alert
    this.reloadText = this.add.text(width / 2, height / 2 + 60, 'RECARGANDO...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);

    // Flashing effect for reload alert
    this.tweens.add({
      targets: this.reloadText,
      alpha: 0.2,
      duration: 250,
      yoyo: true,
      repeat: -1
    });

    // 5. Draw Inventory HUD (Bottom Left)
    this.drawInventory();
  }

  drawInventory() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const g = this.uiGraphics;

    // 3 slots at the bottom left: slot starting x = 20, y = height - 55
    const startX = 20;
    const startY = height - 55;
    const slotSize = 40;
    const spacing = 10;

    for (let i = 1; i <= 3; i++) {
      const x = startX + (i - 1) * (slotSize + spacing);
      const y = startY;

      const weapon = this.levelScene.weapons[i];
      const isEquipped = (this.levelScene.currentWeaponId === i);

      // Draw background box
      if (!weapon.unlocked) {
        g.fillStyle(0x2d3748, 0.4); // Locked slot
        g.lineStyle(1, 0x4a5568, 1);
      } else if (isEquipped) {
        g.fillStyle(0x2b6cb0, 0.8); // Selected slot (blue accent)
        g.lineStyle(2, 0xed8936, 1);  // Gold border
      } else {
        g.fillStyle(0x1a202c, 0.8); // Unselected slot
        g.lineStyle(1, 0xa0aec0, 1);
      }

      g.fillRoundedRect(x, y, slotSize, slotSize, 4);
      g.strokeRoundedRect(x, y, slotSize, slotSize, 4);

      // Label number
      const numText = this.add.text(x + 4, y + 4, i.toString(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: isEquipped ? '#ed8936' : '#a0aec0'
      });
      this.inventoryTexts.push(numText);

      // Weapon short name
      let label = 'BLOQ';
      let labelColor = '#718096';
      if (weapon.unlocked) {
        if (i === 1) label = 'PIST';
        else if (i === 2) label = 'ESCO';
        else if (i === 3) label = 'FUSI';
        labelColor = isEquipped ? '#ffffff' : '#e2e8f0';
      }

      const nameText = this.add.text(x + slotSize / 2, y + slotSize - 12, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '6px',
        color: labelColor
      }).setOrigin(0.5);
      this.inventoryTexts.push(nameText);
    }
  }

  updateHealth() {
    if (!this.levelScene || !this.hpText) return;

    const hp = Math.ceil(this.levelScene.playerHealth);
    const maxHp = this.levelScene.maxHealth;
    this.hpText.setText(`HP: ${hp}/${maxHp}`);

    // Redraw HP Bar
    const g = this.uiGraphics;
    g.fillStyle(0x000000, 0.7);
    g.fillRect(20, 35, 120, 10);

    const pct = hp / maxHp;
    let color = 0x38a169; // Green
    if (pct < 0.3) color = 0xe53e3e; // Red
    else if (pct < 0.6) color = 0xdd6b20; // Orange

    g.fillStyle(color, 1);
    g.fillRect(21, 36, Math.max(0, 118 * pct), 8);
  }

  updateAmmo() {
    if (!this.levelScene || !this.ammoText) return;

    const weapon = this.levelScene.weapons[this.levelScene.currentWeaponId];
    if (weapon) {
      this.ammoText.setText(
        `ARMA: ${weapon.name.toUpperCase()}\n` +
        `CARGADOR: ${weapon.clipAmmo} / ${weapon.clipSize}\n` +
        `RESERVA: ${weapon.reserveAmmo} / ${weapon.maxReserve}`
      );
    }
  }

  updateWeapon() {
    this.updateAmmo();
    // Redraw inventory slot highlighting
    this.drawInventory();
  }

  showReloading() {
    if (this.reloadText) {
      this.reloadText.setVisible(true);
    }
    this.updateAmmo();
  }

  hideReloading() {
    if (this.reloadText) {
      this.reloadText.setVisible(false);
    }
    this.updateAmmo();
  }
}
