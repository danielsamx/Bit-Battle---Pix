import { BaseNivel } from './base_nivel.js';

export class SceneNivel2 extends BaseNivel {
  constructor() {
    super('SceneNivel2', 'NIVEL 2: EL LABERINTO SUBTERRÁNEO', 'SceneNivel3', 'level2_map');
  }

  levelSetup() {
    // Weapons availability for Level 2 (Shotgun unlocked)
    this.weapons[1].unlocked = true;
    this.weapons[2].unlocked = true;
    this.weapons[3].unlocked = false;

    // Maintain current weapon or equip pistol
    if (!this.weapons[this.currentWeaponId].unlocked) {
      this.currentWeaponId = 1;
    }

    // Spawn 5 basic zombies and 4 fast crawlers
    const basicSpawnPoints = [
      { x: 300, y: 150 },
      { x: 500, y: 150 },
      { x: 120, y: 400 },
      { x: 520, y: 420 },
      { x: 320, y: 550 }
    ];

    const fastSpawnPoints = [
      { x: 100, y: 250 },
      { x: 450, y: 250 },
      { x: 220, y: 480 },
      { x: 500, y: 300 }
    ];

    basicSpawnPoints.forEach(pt => {
      // type, speed, health, damageSpeed (per second)
      this.spawnEnemy(pt.x, pt.y, 'enemy1', 50, 45, 15);
    });

    fastSpawnPoints.forEach(pt => {
      // type, speed, health, damageSpeed
      this.spawnEnemy(pt.x, pt.y, 'enemy2', 85, 25, 20);
    });
  }
}
