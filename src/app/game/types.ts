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
}

/** 按键映射 */
export interface KeysPressed {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
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
};
