import { SceneMenu } from './scenes/scene_menu.js';
import { SceneNivel1 } from './scenes/scene_nivel1.js';
import { SceneNivel2 } from './scenes/scene_nivel2.js';
import { SceneNivel3 } from './scenes/scene_nivel3.js';
import { SceneUI } from './scenes/scene_ui.js';
import { SceneGameOver } from './scenes/scene_gameover.js';
import { SceneVictory } from './scenes/scene_victory.js';

const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    SceneMenu,
    SceneNivel1,
    SceneNivel2,
    SceneNivel3,
    SceneUI,
    SceneGameOver,
    SceneVictory
  ],
  pixelArt: true, // Crucial for crisp pixel-art graphics scaling
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
