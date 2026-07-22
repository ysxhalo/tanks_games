import { WallType, GAME_CONFIG, LevelConfig, TankType } from './types';
import { Wall } from './wall';

/**
 * 关卡地图布局
 * 0 = 空地, 1 = 砖墙, 2 = 钢墙, 3 = 水域, 4 = 基地
 */

// 第1关 - 入门（原地图）
const LEVEL_1: number[][] = [
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

// 第2关 - 堡垒
const LEVEL_2: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1,1,0],
  [0,1,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,1,0],
  [0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,1,1,1,1,0,0,0,0,2,0,0,0],
  [0,0,0,2,0,0,0,0,1,0,0,1,0,0,0,0,2,0,0,0],
  [0,1,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,1,0],
  [0,1,0,0,0,0,2,0,3,3,3,3,0,2,0,0,0,0,1,0],
  [0,0,0,0,1,1,0,0,3,0,0,3,0,0,1,1,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
  [1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1],
  [1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// 第3关 - 水域迷宫
const LEVEL_3: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,0,0,3,3,0,0,0,0,3,3,0,0,1,1,0,0],
  [0,0,1,1,0,0,3,3,0,1,1,0,3,3,0,0,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
  [1,1,0,0,2,0,0,0,0,0,0,0,0,0,2,0,0,1,1,0],
  [1,1,0,0,2,0,0,0,0,0,0,0,0,0,2,0,0,1,1,0],
  [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0],
  [3,3,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,3,3],
  [3,3,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,3,3],
  [0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
];

// 第4关 - 最终要塞
const LEVEL_4: number[][] = [
  [1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,2,0,0,1,1,0,0,2,0,0,2,0,0,1,1,0,0,2,0],
  [0,2,0,0,1,1,0,0,2,0,0,2,0,0,1,1,0,0,2,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,0,1,0,0,0,3,3,0,1,1,0,3,3,0,0,0,1,0,1],
  [1,0,1,0,0,0,3,3,0,1,1,0,3,3,0,0,0,1,0,1],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,2,2,0,0,0,0,1,0,0,0,0],
  [0,2,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,2,0],
  [0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0],
  [0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

/** 所有关卡配置 */
const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    enemyCount: 6,
    enemySpeed: 1.2,
    enemyFireInterval: 2000,
    mapLayout: LEVEL_1,
  },
  {
    level: 2,
    enemyCount: 8,
    enemySpeed: 1.4,
    enemyFireInterval: 1800,
    mapLayout: LEVEL_2,
  },
  {
    level: 3,
    enemyCount: 10,
    enemySpeed: 1.6,
    enemyFireInterval: 1600,
    mapLayout: LEVEL_3,
  },
  {
    level: 4,
    enemyCount: 12,
    enemySpeed: 1.8,
    enemyFireInterval: 1400,
    mapLayout: LEVEL_4,
  },
];

/** 获取关卡配置 */
export function getLevelConfig(level: number): LevelConfig {
  const index = Math.min(level - 1, LEVEL_CONFIGS.length - 1);
  return LEVEL_CONFIGS[index];
}

/** 获取总关卡数 */
export function getTotalLevels(): number {
  return LEVEL_CONFIGS.length;
}

/** 获取指定关卡的坦克类型分布 */
export function getEnemyTypesForLevel(level: number): TankType[] {
  const count = getLevelConfig(level).enemyCount;
  const types: TankType[] = [];

  switch (level) {
    case 1:
      // 第1关：全部普通
      for (let i = 0; i < count; i++) types.push(TankType.NORMAL);
      break;
    case 2:
      // 第2关：普通 + 防御型
      for (let i = 0; i < count; i++) {
        types.push(i < count * 0.5 ? TankType.NORMAL : TankType.DEFENSIVE);
      }
      break;
    case 3:
      // 第3关：普通 + 激进 + 狙击
      for (let i = 0; i < count; i++) {
        if (i < count * 0.3) types.push(TankType.NORMAL);
        else if (i < count * 0.6) types.push(TankType.AGGRESSIVE);
        else types.push(TankType.SNIPER);
      }
      break;
    case 4:
      // 第4关：混合所有类型
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        if (r < 0.25) types.push(TankType.NORMAL);
        else if (r < 0.5) types.push(TankType.AGGRESSIVE);
        else if (r < 0.75) types.push(TankType.DEFENSIVE);
        else types.push(TankType.SNIPER);
      }
      break;
    default:
      for (let i = 0; i < count; i++) types.push(TankType.NORMAL);
  }

  return types;
}

/**
 * 生成墙体列表，并在底部中间留出基地
 */
export function generateWalls(layout?: number[][]): Wall[] {
  const walls: Wall[] = [];
  const tileSize = GAME_CONFIG.TILE_SIZE;
  const mapLayout = layout || LEVEL_CONFIGS[0].mapLayout;
  const COLS = mapLayout[0].length;
  const ROWS = mapLayout.length;
  const baseCol = Math.floor(COLS / 2) - 1;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const val = mapLayout[row][col];
      if (val === 0) continue;

      const x = col * tileSize;
      const y = row * tileSize;

      // 在底部中间放置基地
      if (row === ROWS - 1 && (col === baseCol || col === baseCol + 1)) {
        const wall = new Wall(x, y, WallType.BASE);
        walls.push(wall);
        // 基地周围的砖墙保护（避开玩家出生点）
        const playerSpawnCol = Math.floor(COLS / 2) - 1;
        const playerSpawnRow = ROWS - 2;
        if (row > 0) {
          for (let dr = -1; dr <= 0; dr++) {
            for (let dc = -1; dc <= 2; dc++) {
              if (dr === 0 && (dc === 0 || dc === 1)) continue; // 基地本身位置
              const protectCol = col + dc;
              const protectRow = row + dr;
              // 跳过玩家出生点
              if (protectRow === playerSpawnRow && protectCol === playerSpawnCol) continue;
              const wx = protectCol * tileSize;
              const wy = protectRow * tileSize;
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
export function getPlayerStart(layout?: number[][]): { x: number; y: number } {
  const tileSize = GAME_CONFIG.TILE_SIZE;
  const mapLayout = layout || LEVEL_CONFIGS[0].mapLayout;
  const COLS = mapLayout[0].length;
  const ROWS = mapLayout.length;
  return {
    x: Math.floor(COLS / 2) * tileSize - tileSize,
    y: (ROWS - 2) * tileSize,
  };
}

/** 获取敌军出生点列表（顶部随机位置） */
export function getEnemySpawnPoints(): { x: number; y: number }[] {
  const tileSize = GAME_CONFIG.TILE_SIZE;
  const COLS = 20;
  return [
    { x: 1 * tileSize, y: 0 },
    { x: Math.floor(COLS / 2) * tileSize, y: 0 },
    { x: (COLS - 3) * tileSize, y: 0 },
    { x: 2 * tileSize, y: 1 * tileSize },
    { x: (COLS - 4) * tileSize, y: 1 * tileSize },
  ];
}
