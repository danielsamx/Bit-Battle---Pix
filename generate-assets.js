const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure directories exist
const dirs = [
  'assets/audio',
  'assets/images/kael',
  'assets/images/enemy',
  'assets/tilemaps',
];
dirs.forEach(d => {
  const dirPath = path.resolve(__dirname, d);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// PNG Generation Helper (100% JS, using native zlib)
function writePNG(width, height, pixels, filePath) {
  const rowSize = width * 4;
  const buffer = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    buffer[y * (rowSize + 1)] = 0; // Filter type 0
    pixels.copy(buffer, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = zlib.deflateSync(buffer);

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filePath, png);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Drawing helper
class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = Buffer.alloc(width * height * 4); // RGBA filled with transparent
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.buffer[idx] = r;
    this.buffer[idx + 1] = g;
    this.buffer[idx + 2] = b;
    this.buffer[idx + 3] = a;
  }

  drawRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, r, g, b, a);
      }
    }
  }

  drawSprite(xStart, yStart, grid, palette) {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char !== ' ' && palette[char]) {
          const color = palette[char];
          this.setPixel(xStart + x, yStart + y, color[0], color[1], color[2], color[3] !== undefined ? color[3] : 255);
        }
      }
    }
  }
}

// Color palettes
const PALETTE_KAEL = {
  'H': [255, 220, 180], // Skin
  'Y': [255, 215, 0],   // Yellow Hair
  'A': [50, 80, 200],   // Blue Armor
  'C': [200, 30, 30],   // Red Cape
  'L': [60, 40, 20],    // Brown Leather Pants / Boots
  'S': [180, 180, 180], // Steel Weapon
  'W': [120, 70, 20],   // Wood Weapon
  'F': [255, 100, 0],   // Muzzle flash
};

const PALETTE_ENEMY1 = {
  'H': [80, 180, 80],   // Green Skin (Zombie)
  'A': [100, 50, 150],  // Purple Ripped Shirt
  'L': [50, 50, 80],    // Blue Ripped Pants
  'E': [255, 50, 50],   // Red Eyes
  'B': [200, 30, 30],   // Blood
};

const PALETTE_ENEMY2 = {
  'H': [150, 50, 150],  // Purple Skin (Speed crawler)
  'A': [220, 220, 50],  // Yellow Glowing markings
  'L': [80, 30, 80],    // Dark purple limbs
  'E': [255, 255, 0],   // Yellow Eyes
  'B': [200, 30, 30],   // Blood
};

const PALETTE_ENEMY3 = {
  'H': [120, 120, 130], // Grey Stone Skin (Golem tank)
  'A': [0, 200, 255],   // Blue Runes
  'L': [80, 80, 90],    // Darker stone
  'E': [0, 255, 255],   // Cyan Eyes
  'B': [180, 180, 180], // Dust particles / debris
};

const PALETTE_BOSS = {
  'H': [220, 40, 40],   // Dark Red Skin (Demon/Dragon Boss)
  'Y': [30, 30, 30],    // Dark Horns / Spikes
  'A': [255, 150, 0],   // Lava lines
  'L': [150, 20, 20],   // Dark red tail/legs
  'E': [255, 255, 255], // White glowing eyes
  'S': [100, 100, 100], // Dark metal claws
  'F': [255, 255, 0],   // Fire
};

// Generates a 5-frame animation sheets for a character pose
function makeCharacterSheet(palette, poseFunc) {
  const canvas = new PixelCanvas(125, 25);
  for (let frame = 0; frame < 5; frame++) {
    const grid = poseFunc(frame);
    // Draw the 25x25 grid centered in each frame block (xOffset = frame * 25)
    canvas.drawSprite(frame * 25 + 5, 2, grid, palette);
  }
  return canvas;
}

// Define grids dynamically
const walkPose = (frame) => {
  const legOffset = (frame % 2 === 0) ? 0 : (frame === 1 ? 1 : -1);
  return [
    "    YYYY     ",
    "   YYYYYY    ",
    "   YHHHHH    ",
    "    HHHH     ",
    "   AAAAAA    ",
    "  AAAAAAAA   ",
    "  AA AA AA   ",
    "  AA AA AA   ",
    "   AA  AA    ",
    "   DD  DD    ",
    `   ${legOffset >= 0 ? 'D' : ' '}D  D${legOffset <= 0 ? 'D' : ' '}    `,
    `   ${legOffset > 0 ? 'L' : ' '}L  L${legOffset < 0 ? 'L' : ' '}    `
  ];
};

const runPose = (frame) => {
  const legOffset = (frame % 2 === 0) ? 0 : (frame === 1 ? 2 : -2);
  return [
    "    YYYY     ",
    "   YYYYYY    ",
    "  YYHHHHH    ",
    "   YHHHH     ",
    "   AAAAAA    ",
    "  AAAAAAAA   ",
    " AAAAAAAAAA  ",
    " AA AAAA AA  ",
    "   AA  AA    ",
    "   DD  DD    ",
    `  ${legOffset >= 0 ? 'DD' : '  '}  ${legOffset <= 0 ? 'DD' : '  '}   `,
    `  ${legOffset > 0 ? 'LL' : '  '}  ${legOffset < 0 ? 'LL' : '  '}   `
  ];
};

const attackPose = (frame) => {
  // Weapon extends more in frame 2
  const s = (frame === 2) ? 'SSSSSSSS' : ((frame === 1 || frame === 3) ? 'SSSSSS' : 'SSS');
  return [
    "    YYYY     ",
    "   YYYYYY    ",
    "   YHHHHH    ",
    "    HHHH     ",
    "   AAAAAA    ",
    `  AAAAAAAA${s} `,
    "  AA AA AA   ",
    "  AA AA AA   ",
    "   AA  AA    ",
    "   DD  DD    ",
    "   DD  DD    ",
    "   LL  LL    "
  ];
};

const shootPose = (frame) => {
  // Gun flash in frames 1 & 3
  const flash = (frame === 1 || frame === 3) ? 'FFFF' : '    ';
  const gun = 'SSSSSS';
  return [
    "    YYYY     ",
    "   YYYYYY    ",
    "   YHHHHH    ",
    "    HHHH     ",
    "   AAAAAA    ",
    `  AAAAAAAA${gun}${flash}`,
    "  AA AA AA   ",
    "  AA AA AA   ",
    "   AA  AA    ",
    "   DD  DD    ",
    "   DD  DD    ",
    "   LL  LL    "
  ];
};

const changePose = (frame) => {
  // Hands up or pose change
  const armL = (frame % 2 === 0) ? 'A' : ' ';
  const armR = (frame % 2 === 0) ? 'A' : ' ';
  return [
    "    YYYY     ",
    "   YYYYYY    ",
    "   YHHHHH    ",
    "    HHHH     ",
    `  ${armL}AAAAAA${armR}  `,
    "  AAAAAAAA   ",
    "  AA AA AA   ",
    "  AA AA AA   ",
    "   AA  AA    ",
    "   DD  DD    ",
    "   DD  DD    ",
    "   LL  LL    "
  ];
};

const diedPose = (frame) => {
  // Rotate and fade/spill blood
  if (frame === 0) {
    return walkPose(0);
  } else if (frame === 1) {
    // Tilted
    return [
      "      YYYY   ",
      "     YYYYYY  ",
      "    YHHHHH   ",
      "     HHHH    ",
      "    AAAAAA   ",
      "   AAAAAAA   ",
      "   AA AA AA  ",
      "    BB  BB   ",
      "    LL  LL   "
    ];
  } else if (frame === 2) {
    // Down
    return [
      "             ",
      "             ",
      "             ",
      "    YYYYYY   ",
      "   YHHHHHAA  ",
      "  BBBBBBBBBB ",
      "   LLLLLLLL  "
    ];
  } else if (frame === 3) {
    // Dissolving/Goo
    return [
      "             ",
      "             ",
      "             ",
      "    HHHH     ",
      "  BBBBBBBBBB ",
      " BBBBBBBBBBBB"
    ];
  } else {
    // Blood puddle
    return [
      "             ",
      "             ",
      "             ",
      "  BBBBBBBB   ",
      " BBBBBBBBBBB "
    ];
  }
};

// Generate player sheets
console.log('Generating Kael spritesheets...');
writePNG(125, 25, makeCharacterSheet(PALETTE_KAEL, walkPose).buffer, 'assets/images/kael/walk.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_KAEL, runPose).buffer, 'assets/images/kael/run.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_KAEL, attackPose).buffer, 'assets/images/kael/attack.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_KAEL, shootPose).buffer, 'assets/images/kael/shoot.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_KAEL, changePose).buffer, 'assets/images/kael/change.png');

// Generate enemy sheets
console.log('Generating enemy spritesheets...');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY1, walkPose).buffer, 'assets/images/enemy/enemy1_walk.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY1, runPose).buffer, 'assets/images/enemy/enemy1_run.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY1, diedPose).buffer, 'assets/images/enemy/enemy1_died.png');

writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY2, walkPose).buffer, 'assets/images/enemy/enemy2_walk.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY2, runPose).buffer, 'assets/images/enemy/enemy2_run.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY2, diedPose).buffer, 'assets/images/enemy/enemy2_died.png');

writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY3, walkPose).buffer, 'assets/images/enemy/enemy3_walk.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY3, runPose).buffer, 'assets/images/enemy/enemy3_run.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_ENEMY3, diedPose).buffer, 'assets/images/enemy/enemy3_died.png');

writePNG(125, 25, makeCharacterSheet(PALETTE_BOSS, walkPose).buffer, 'assets/images/enemy/boss_walk.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_BOSS, runPose).buffer, 'assets/images/enemy/boss_run.png');
writePNG(125, 25, makeCharacterSheet(PALETTE_BOSS, diedPose).buffer, 'assets/images/enemy/boss_died.png');

// Generate Tileset (128x128 containing four 32x32 tiles)
console.log('Generating tileset...');
const tileset = new PixelCanvas(128, 128);

// Tile 1: Floor (Light stone texture)
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    // grid borders
    const isBorder = (x === 0 || y === 0 || x === 31 || y === 31);
    const noise = (Math.sin(x * 0.5) * Math.cos(y * 0.5) * 10) + (x + y) % 3;
    const c = isBorder ? 90 + noise : 140 + noise;
    tileset.setPixel(x, y, c, c, c + 5);
  }
}

// Tile 2: Wall (Grey brick texture)
for (let y = 0; y < 32; y++) {
  for (let x = 32; x < 64; x++) {
    const rx = x - 32;
    const isBrickBorder = (y === 0 || y === 10 || y === 21 || y === 31 || rx === 0 || rx === 16 || (y > 10 && y < 21 && (rx === 8 || rx === 24)));
    const c = isBrickBorder ? 40 : 80 + (rx % 5) * 5;
    tileset.setPixel(x, y, c, c, c);
  }
}

// Tile 3: Obstacle/Crate (Wood/Stone Chest/Pillar)
for (let y = 0; y < 32; y++) {
  for (let x = 64; x < 96; x++) {
    const rx = x - 64;
    const isBorder = (rx === 0 || y === 0 || rx === 31 || y === 31 || rx === y || (31 - rx) === y);
    if (isBorder) {
      tileset.setPixel(x, y, 100, 60, 30); // Wood borders
    } else {
      tileset.setPixel(x, y, 160, 110, 50); // Inside wood color
    }
  }
}

// Tile 4: Exit Portal (Glowing Gold)
for (let y = 0; y < 32; y++) {
  for (let x = 96; x < 128; x++) {
    const rx = x - 96;
    const distToCenter = Math.sqrt(Math.pow(rx - 16, 2) + Math.pow(y - 16, 2));
    if (distToCenter < 12 && distToCenter > 8) {
      tileset.setPixel(x, y, 255, 215, 0); // Gold circle
    } else if (distToCenter <= 8) {
      const alpha = Math.floor(100 + Math.sin(distToCenter) * 155);
      tileset.setPixel(x, y, 0, 200, 255, alpha); // Cyan inside
    } else {
      tileset.setPixel(x, y, 0, 0, 0, 0); // Transparent
    }
  }
}

writePNG(128, 128, tileset.buffer, 'assets/images/tileset.png');

// Generate Bullet (8x8 yellow laser circle)
console.log('Generating bullet sprite...');
const bullet = new PixelCanvas(8, 8);
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    const dist = Math.sqrt(Math.pow(x - 3.5, 2) + Math.pow(y - 3.5, 2));
    if (dist < 3) {
      bullet.setPixel(x, y, 255, 230, 50);
    } else if (dist < 4) {
      bullet.setPixel(x, y, 255, 100, 0);
    }
  }
}
writePNG(8, 8, bullet.buffer, 'assets/images/bullet.png');

// Generate Ammunition pickups (16x16 pixels)
function makeAmmoSprite(r, g, b) {
  const ammo = new PixelCanvas(16, 16);
  // Draw small metal crate
  for (let y = 2; y < 14; y++) {
    for (let x = 2; x < 14; x++) {
      const isBorder = (x === 2 || y === 2 || x === 13 || y === 13);
      if (isBorder) {
        ammo.setPixel(x, y, 100, 100, 100);
      } else if (x === 7 || x === 8) {
        ammo.setPixel(x, y, r, g, b); // Ammo color label
      } else {
        ammo.setPixel(x, y, 50, 50, 50);
      }
    }
  }
  return ammo;
}
console.log('Generating ammo sprites...');
writePNG(16, 16, makeAmmoSprite(255, 200, 0).buffer, 'assets/images/ammo_pistol.png');
writePNG(16, 16, makeAmmoSprite(255, 50, 50).buffer, 'assets/images/ammo_shotgun.png');
writePNG(16, 16, makeAmmoSprite(50, 200, 50).buffer, 'assets/images/ammo_rifle.png');

// Generate standard tilemaps JSON
function createTilemapJSON(width, height, mapData) {
  const floorData = Array(width * height).fill(1); // Set entire background to Floor (1)
  const wallData = Array(width * height).fill(0);

  // Apply map layout
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = mapData[y][x];
      const idx = y * width + x;
      if (cell === 2) {
        wallData[idx] = 2; // Wall
      } else if (cell === 3) {
        wallData[idx] = 3; // Obstacle
      } else if (cell === 4) {
        floorData[idx] = 4; // Portal is on floor layer
      }
    }
  }

  return {
    "compressionlevel": -1,
    "width": width,
    "height": height,
    "tilewidth": 32,
    "tileheight": 32,
    "infinite": false,
    "layers": [
      {
        "data": floorData,
        "height": height,
        "width": width,
        "name": "Floor",
        "opacity": 1,
        "type": "tilelayer",
        "visible": true,
        "x": 0,
        "y": 0
      },
      {
        "data": wallData,
        "height": height,
        "width": width,
        "name": "Walls",
        "opacity": 1,
        "type": "tilelayer",
        "visible": true,
        "x": 0,
        "y": 0
      }
    ],
    "nextlayerid": 3,
    "nextobjectid": 1,
    "orientation": "orthogonal",
    "renderorder": "right-down",
    "tiledversion": "1.8.4",
    "tilesets": [
      {
        "firstgid": 1,
        "name": "tileset",
        "image": "assets/images/tileset.png",
        "imageheight": 128,
        "imagewidth": 128,
        "tilewidth": 32,
        "tileheight": 32,
        "margin": 0,
        "spacing": 0,
        "tilecount": 16,
        "columns": 4
      }
    ],
    "type": "map",
    "version": "1.8"
  };
}

console.log('Generating level maps JSON...');
// Level 1: 15x15 grid
const map1Grid = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,1,1,1,1,1,1,2,1,1,1,1,1,1,2],
  [2,1,3,1,1,3,1,2,1,3,1,1,3,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,3,1,1,3,1,1,1,3,1,1,3,1,2],
  [2,1,1,1,1,1,1,2,1,1,1,1,1,1,2],
  [2,2,1,2,2,2,1,2,1,2,2,2,1,2,2],
  [2,1,1,1,1,1,1,2,1,1,1,1,1,1,2],
  [2,1,3,1,1,3,1,1,1,3,1,1,3,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,3,1,1,3,1,2,1,3,1,1,3,1,2],
  [2,1,1,1,1,1,1,2,1,1,1,1,1,4,2], // Portal at bottom-right (tile value 4)
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
];
fs.writeFileSync('assets/tilemaps/nivel1.json', JSON.stringify(createTilemapJSON(15, 15, map1Grid), null, 2));

// Level 2: 20x20 grid
const map2Grid = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2],
  [2,1,3,3,1,1,2,1,3,3,3,3,1,2,1,1,3,3,1,2],
  [2,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2],
  [2,2,2,1,2,2,2,2,2,1,1,2,2,2,2,2,1,2,2,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,3,3,1,1,2,2,2,3,3,2,2,2,1,1,3,3,1,2],
  [2,1,3,3,1,1,2,1,1,1,1,1,1,2,1,1,3,3,1,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2],
  [2,1,3,3,1,1,2,1,1,1,1,1,1,2,1,1,3,3,1,2],
  [2,1,3,3,1,1,2,2,2,2,2,2,2,2,1,1,3,3,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,2,2,1,2,2,2,2,2,1,1,2,2,2,2,2,1,2,2,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2],
  [2,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2],
  [2,1,3,3,1,1,2,1,3,3,3,3,1,2,1,1,3,3,1,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,4,2], // Portal at bottom-right
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
];
fs.writeFileSync('assets/tilemaps/nivel2.json', JSON.stringify(createTilemapJSON(20, 20, map2Grid), null, 2));

// Level 3: 25x25 grid
const map3Grid = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2],
  [2,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,2], // Portal at exact center (spawned dynamically or placed here)
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2],
  [2,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
];
fs.writeFileSync('assets/tilemaps/nivel3.json', JSON.stringify(createTilemapJSON(25, 25, map3Grid), null, 2));

// Generate synthesized sounds in WAV format
function writeWav(samples, sampleRate, filePath) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // Linear PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const val = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

console.log('Generating sound effects...');
const sampleRate = 22050;

// 1. Menu: Upward retro arpeggio (square waves)
const menuSamples = [];
const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
const durationPerNote = 0.15;
notes.forEach((freq) => {
  const numSamples = Math.floor(sampleRate * durationPerNote);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Square wave
    const sample = Math.sin(2 * Math.PI * freq * t) >= 0 ? 0.25 : -0.25;
    // Apply envelope
    const env = 1 - (i / numSamples);
    menuSamples.push(sample * env);
  }
});
writeWav(menuSamples, sampleRate, 'assets/audio/menu.wav');

// 2. daño_recibido: Quick noise blast / crunch
const danoSamples = [];
const danoDur = 0.15;
const danoNum = Math.floor(sampleRate * danoDur);
for (let i = 0; i < danoNum; i++) {
  // Random noise mixed with falling triangle wave
  const t = i / sampleRate;
  const freq = 400 * (1 - t / danoDur);
  const tri = (Math.asin(Math.sin(2 * Math.PI * freq * t)) / (Math.PI / 2)) * 0.3;
  const noise = (Math.random() * 2 - 1) * 0.2;
  const env = Math.pow(1 - i / danoNum, 2);
  danoSamples.push((tri + noise) * env);
}
writeWav(danoSamples, sampleRate, 'assets/audio/dano_recibido.wav');

// 3. muerte_jugador: Long falling pitch sweep
const deathSamples = [];
const deathDur = 1.0;
const deathNum = Math.floor(sampleRate * deathDur);
let deathPhase = 0;
for (let i = 0; i < deathNum; i++) {
  const t = i / sampleRate;
  const freq = 440 * Math.pow(0.1, t); // Exponential slide from 440Hz to 44Hz
  deathPhase += (2 * Math.PI * freq) / sampleRate;
  const sine = Math.sin(deathPhase) * 0.3;
  const env = Math.max(0, 1 - t / deathDur);
  deathSamples.push(sine * env);
}
writeWav(deathSamples, sampleRate, 'assets/audio/muerte_jugador.wav');

// 4. game_over: Sad descending melody (4 notes)
const goSamples = [];
const goNotes = [196.00, 185.00, 174.61, 146.83]; // G3, F#3, F3, D3
const goNoteDur = 0.35;
goNotes.forEach((freq) => {
  const numSamples = Math.floor(sampleRate * goNoteDur);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sine = Math.sin(2 * Math.PI * freq * t) * 0.25;
    const env = 1 - (i / numSamples);
    goSamples.push(sine * env);
  }
});
writeWav(goSamples, sampleRate, 'assets/audio/game_over.wav');

// 5. ambiente_loop: Low drone hum (85Hz sine wave with slight modulation)
const ambientSamples = [];
const ambientDur = 4.0;
const ambientNum = Math.floor(sampleRate * ambientDur);
for (let i = 0; i < ambientNum; i++) {
  const t = i / sampleRate;
  const mod = 1 + Math.sin(2 * Math.PI * 0.5 * t) * 0.05; // 0.5Hz modulation
  const sine = Math.sin(2 * Math.PI * 65 * mod * t) * 0.15;
  // Make it start and end at the same amplitude for a smooth loop
  const fadeWidth = Math.floor(sampleRate * 0.1);
  let fade = 1.0;
  if (i < fadeWidth) {
    fade = i / fadeWidth;
  } else if (i > ambientNum - fadeWidth) {
    fade = (ambientNum - i) / fadeWidth;
  }
  ambientSamples.push(sine * fade);
}
writeWav(ambientSamples, sampleRate, 'assets/audio/ambiente_loop.wav');

// 6. disparo_arma: Classic white noise laser burst
const shootSamples = [];
const shootDur = 0.12;
const shootNum = Math.floor(sampleRate * shootDur);
for (let i = 0; i < shootNum; i++) {
  const t = i / sampleRate;
  const freq = 1600 * (1 - t / shootDur); // Falling frequency
  const sine = Math.sin(2 * Math.PI * freq * t) * 0.2;
  const noise = (Math.random() * 2 - 1) * 0.15;
  const env = Math.max(0, 1 - t / shootDur);
  shootSamples.push((sine + noise) * env);
}
writeWav(shootSamples, sampleRate, 'assets/audio/disparo_arma.wav');

console.log('Asset generation complete.');
