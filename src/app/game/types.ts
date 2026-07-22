/** 方向枚举 */
export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

/** 坐标 */
export interface Position {
  x: number;
  y: number;
}

/** 尺寸 */
export interface Size {
  width: number;
  height: number;
}

/** 墙体类型 */
export enum WallType {
  BRICK = 'brick',     // 砖墙 — 可被子弹打碎
  STEEL = 'steel',     // 钢墙 — 不可摧毁
  WATER = 'water',     // 水域 — 坦克不能通过，子弹可通过
  BASE = 'base',       // 基地 — 被摧毁则游戏结束
}

/** 游戏状态 */
export enum GameState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
  LEVEL_COMPLETE = 'level_complete',
  LEADERBOARD = 'leaderboard',
  NAME_INPUT = 'name_input',
}

/** 按键映射 */
export interface KeysPressed {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

/** 道具类型 */
export enum PowerUpType {
  SPEED = 'speed',               // 加速
  INVINCIBILITY = 'invincibility', // 无敌
  SPREAD = 'spread',             // 散弹
  EXTRA_LIFE = 'extra_life',     // 加命
}

/** 坦克类型（AI 行为模式） */
export enum TankType {
  NORMAL = 'normal',         // 普通：随机移动 + 偶尔追踪
  AGGRESSIVE = 'aggressive', // 激进：高追踪概率 + 高射速
  DEFENSIVE = 'defensive',   // 防御：靠近基地守卫
  SNIPER = 'sniper',        // 狙击手：远距离瞄准射击
}

/** 关卡配置 */
export interface LevelConfig {
  level: number;
  enemyCount: number;
  enemySpeed: number;
  enemyFireInterval: number;
  mapLayout: number[][];
}

/** 排行榜条目 */
export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

/** 道具状态（附加在坦克上） */
export interface PowerUpState {
  type: PowerUpType;
  remaining: number; // 剩余时间 ms
}

/** 游戏配置 */
export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  TILE_SIZE: 40,
  TANK_SIZE: 36,
  TANK_SPEED: 2.5,
  BULLET_SPEED: 5,
  BULLET_SIZE: 6,
  PLAYER_LIVES: 3,
  ENEMY_COUNT: 6,
  ENEMY_SPEED: 1.2,
  ENEMY_FIRE_INTERVAL: 2000,   // 毫秒
  PLAYER_FIRE_COOLDOWN: 300,   // 毫秒
  MAX_BULLETS: 3,              // 同时存在的最大子弹数

  // 道具系统
  POWERUP_DROP_CHANCE: 0.25,    // 敌人死亡掉落道具概率
  POWERUP_DURATION: 5000,       // 道具效果持续毫秒
  POWERUP_SIZE: 24,             // 道具图标大小
  POWERUP_SPEED_MULTIPLIER: 1.8, // 加速倍数
  POWERUP_BOUNCE_HEIGHT: 5,     // 道具浮动幅度
  POWERUP_BOUNCE_SPEED: 0.004,  // 道具浮动速度

  // 关卡系统
  TOTAL_LEVELS: 4,

  // 排行榜
  LEADERBOARD_MAX: 10,
  STORAGE_KEY: 'tank_battle_leaderboard',
};
