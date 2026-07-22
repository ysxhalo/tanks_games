import { WallType, GAME_CONFIG } from './types';
import { Wall } from './wall';

/**
 * 生成游戏地图
 * 0 = 空地, 1 = 砖墙, 2 = 钢墙, 3 = 水域, 4 = 基地
 */
const MAP_LAYOUT: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1,0,0],
  [0,0,1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1,0,0],
  [0,0,1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,2,2,0,0,0,0,0,0,0,0,2,2,0,0,0,0],
  [0,0,1,0,2,2,0,0,3,3,3,3,0,0,2,2,0,1,0,0],
  [0,0,1,0,0,0,0,0,3,0,0,3,0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,1,0,3,0,0,3,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
  [0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0],
  [0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
];

const COLS = MAP_LAYOUT[0].length;
const ROWS = MAP_LAYOUT.length;

/** 生成墙体列表，并在底部中间留出基地 */
export function generateWalls(): Wall[] {
  const walls: Wall[] = [];
  const tileSize = GAME_CONFIG.TILE_SIZE;
  const baseCol = Math.floor(COLS / 2) - 1;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const val = MAP_LAYOUT[row][col];
      if (val === 0) continue;

      const x = col * tileSize;
      const y = row * tileSize;

      // 在底部中间放置基地
      if (row === ROWS - 1 && (col === baseCol || col === baseCol + 1)) {
        const wall = new Wall(x, y, WallType.BASE);
        walls.push(wall);
        // 基地周围的砖墙保护
        if (row > 0) {
          for (let dr = -1; dr <= 0; dr++) {
            for (let dc = -1; dc <= 2; dc++) {
              if (dr === 0 && (dc === 0 || dc === 1)) continue; // 基地本身位置
              const wx = (col + dc) * tileSize;
              const wy = (row + dr) * tileSize;
              if (wx >= 0 && wy >= 0 && wx < GAME_CONFIG.CANVAS_WIDTH) {
                walls.push(new Wall(wx, wy, WallType.BRICK));
              }
            }
          }
        }
        continue;
      }

      let type: WallType;
      switch (val) {
        case 1: type = WallType.BRICK; break;
        case 2: type = WallType.STEEL; break;
        case 3: type = WallType.WATER; break;
        default: continue;
      }

      walls.push(new Wall(x, y, type));
    }
  }

  return walls;
}

/** 获取玩家初始位置（底部中间偏左） */
export function getPlayerStart(): { x: number; y: number } {
  const tileSize = GAME_CONFIG.TILE_SIZE;
  return {
    x: Math.floor(COLS / 2) * tileSize - tileSize,
    y: (ROWS - 2) * tileSize,
  };
}

/** 获取敌军出生点列表（顶部随机位置） */
export function getEnemySpawnPoints(): { x: number; y: number }[] {
  const tileSize = GAME_CONFIG.TILE_SIZE;
  return [
    { x: 1 * tileSize, y: 0 },
    { x: Math.floor(COLS / 2) * tileSize, y: 0 },
    { x: (COLS - 3) * tileSize, y: 0 },
    { x: 2 * tileSize, y: 1 * tileSize },
    { x: (COLS - 4) * tileSize, y: 1 * tileSize },
  ];
}

export { COLS, ROWS };
