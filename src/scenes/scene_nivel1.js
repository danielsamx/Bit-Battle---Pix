import { BaseNivel } from './base_nivel.js';

export class SceneNivel1 extends BaseNivel {
  constructor() {
    super('SceneNivel1', 'NIVEL 1: LAS ALCANTARILLAS', 'SceneNivel2', 'level1_map');
  }

  levelSetup() {
    // Force weapons availability for Level 1
    this.weapons[1].unlocked = true;
    this.weapons[2].unlocked = false;
    this.weapons[3].unlocked = false;

    // Equip pistol by default
    this.currentWeaponId = 1;

    // Spawn 5 basic enemies (enemy1) at specific spots
    const spawnPoints = [
      { x: 300, y: 150 },
      { x: 400, y: 300 },
      { x: 120, y: 350 },
      { x: 280, y: 400 },
      { x: 380, y: 220 }
    ];

    spawnPoints.forEach(pt => {
      // type, speed, health, damageSpeed (per second)
      this.spawnEnemy(pt.x, pt.y, 'enemy1', 45, 30, 15);
    });
  }
}
