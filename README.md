# Kael: The Top-down Chronicles

Un juego RPG retro top-down desarrollado con **Phaser 3** y **Vite**.

## Características del Juego

1. **Perspectiva Cenital (Top-down)**: Sin gravedad, movimiento omnidireccional con colisiones a través de Arcade Physics.
2. **Sistema de Armas**:
   - **Pistola (Teclado 1)**: Desbloqueada por defecto en el Nivel 1.
   - **Escopeta (Teclado 2)**: Se desbloquea tras completar el Nivel 1. Dispara un abanico de 5 perdigones.
   - **Fusil de Asalto (Teclado 3)**: Se desbloquea tras completar el Nivel 2. Disparos automáticos y rápidos.
   - Cada arma tiene daño, cadencia y cargador propios.
   - Recarga semiautomática o manual mediante la tecla **R**.
3. **Enemigos Progresivos**:
   - **Zombie Básico (enemy1)**: Velocidad y daño moderado.
   - **Crawler Rápido (enemy2)**: Muy veloz, menos vida, gran daño por segundo.
   - **Stone Tank (enemy3)**: Lento pero resistente, inflige daño masivo al contacto.
   - **Destructor Kael-X (Jefe Final - Nivel 3)**: Gran barra de vida y dos patrones de ataque a distancia (Explosión Ígnea en círculo y Ráfaga Focalizada dirigida).
4. **Recogida de Munición**: Al morir, los enemigos sueltan munición de forma aleatoria para las armas que ya tengas desbloqueadas.
5. **Efectos y Sonidos Retro**:
   - Sonidos sintetizados en tiempo real grabados como WAV locales.
   - Animaciones personalizadas de 5 frames (movimiento, disparo, recarga, muerte de enemigos).
   - Efectos de retroceso de cámara y números de daño flotantes (RPG style).

## Controles

- **Movimiento**: Teclas `W`, `A`, `S`, `D` o `Flechas`
- **Apuntar**: Mover el `puntero del ratón`
- **Disparar**: `Click izquierdo`
- **Recargar**: Tecla `R`
- **Cambio de Arma**: Teclas `1`, `2` y `3`
- **Interactuar/Aceptar/Reintentar**: Tecla `Enter`

## Estructura de Archivos

```text
assets/
  audio/         # menú, daño, muerte, game over, ambiente, disparo
  images/
    kael/        # sprites del jugador (hojas 25x25, 5 frames por animación)
    enemy/       # subcarpetas: enemy1_run.png, enemy1_walk.png, enemy1_died.png, etc.
  tilemaps/      # mapas .json (nivel1, nivel2, nivel3)
src/
  scenes/
    base_nivel.js     # Clase base con la lógica de juego y físicas
    scene_menu.js     # Menú de título y precarga de recursos
    scene_ui.js       # HUD Overlay (Vida, armas, inventario de ranuras)
    scene_nivel1.js   # Nivel 1: Alcantarillas
    scene_nivel2.js   # Nivel 2: Laberinto
    scene_nivel3.js   # Nivel 3: Altar Oscuro (Jefe final)
    scene_gameover.js # Fin de partida y retry
    scene_victory.js  # Pantalla de victoria final
  main.js             # Configuración del motor Phaser 3
index.html            # Contenedor HTML y estilos base
package.json          # Script de Vite y generador de assets
generate-assets.js    # Utilidad para generar assets (PNG, WAV, JSON)
```

## Instrucciones para Ejecutar Localmente

### Requisitos

Tener instalado **Node.js** (versión 16 o superior).

### Instalación

1. Clona o copia el directorio en tu máquina local.
2. Abre la terminal en esta ruta y ejecuta:
   ```bash
   npm install
   ```

### Generar Recursos (Opcional, ya pre-generados)

Los recursos del juego (spritesheets, WAVs, y JSONs de niveles) se generan automáticamente mediante un script nativo de Node.js. Si necesitas regenerarlos:
```bash
npm run generate-assets
```

### Ejecutar en Desarrollo

Para iniciar el servidor local con Vite:
```bash
npm run dev
```
Luego haz clic en el enlace local de la terminal (típicamente `http://localhost:5173`) para jugar.
