import { Tank } from './tank';
import { Direction, GAME_CONFIG, WallType, TankType } from './types';
import { Wall } from './wall';

const DIRECTIONS = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

/**
 * AI 决策结果
 */
export interface AIDecision {
  moveX: number;
  moveY: number;
  shouldFire: boolean;
}

/**
 * 主 AI 更新函数 - 根据坦克类型分派不同的行为
 */
export function updateAI(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  dt: number
): AIDecision {
  if (!tank.alive) return { moveX: 0, moveY: 0, shouldFire: false };

  switch (tank.tankType) {
    case TankType.AGGRESSIVE:
      return updateAggressiveAI(tank, walls, playerTank, otherEnemies, dt);
    case TankType.DEFENSIVE:
      return updateDefensiveAI(tank, walls, playerTank, otherEnemies, dt);
    case TankType.SNIPER:
      return updateSniperAI(tank, walls, playerTank, otherEnemies, dt);
    case TankType.NORMAL:
    default:
      return updateNormalAI(tank, walls, playerTank, otherEnemies, dt);
  }
}

/**
 * 普通 AI（原版行为增强）
 * - 随机移动，30%概率追踪玩家
 * - 被阻挡时换方向
 * - 中等射速
 */
function updateNormalAI(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  dt: number
): AIDecision {
  tank.aiTimer += dt;

  const trackPlayer = Math.random() < 0.3 && playerTank.alive;

  if (trackPlayer) {
    const dx = playerTank.x - tank.x;
    const dy = playerTank.y - tank.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }

    if (canShootTarget(tank, playerTank, walls)) {
      return { moveX: 0, moveY: 0, shouldFire: true };
    }
  } else {
    if (tank.aiTimer >= tank.aiDirectionChange) {
      tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      tank.aiDirectionChange = 1500 + Math.random() * 2500;
      tank.aiTimer = 0;
    }
  }

  return computeMovement(tank, walls, playerTank, otherEnemies, 0.02);
}

/**
 * 激进 AI
 * - 80%概率追踪玩家
 * - 高射速，积极开火
 * - 绕侧翼移动
 */
function updateAggressiveAI(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  dt: number
): AIDecision {
  tank.aiTimer += dt;

  // 激进型更频繁追踪玩家
  const trackPlayer = (Math.random() < 0.8 || tank.aiTimer < 500) && playerTank.alive;

  if (trackPlayer) {
    const dx = playerTank.x - tank.x;
    const dy = playerTank.y - tank.y;

    // 尝试侧翼逼近 —— 不直接朝玩家，而是稍微偏移
    const flankOffset = 60;
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平距离更远，从斜角接近
      if (Math.abs(dx) > flankOffset * 2) {
        tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
      }
    } else {
      if (Math.abs(dy) > flankOffset * 2) {
        tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
      } else {
        tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      }
    }

    // 能射击就立刻开火
    if (canShootTarget(tank, playerTank, walls)) {
      return { moveX: 0, moveY: 0, shouldFire: true };
    }

    // 即使不能直线射击也随机开火（压制火力）
    if (Math.random() < 0.05) {
      return { moveX: 0, moveY: 0, shouldFire: true };
    }
  } else {
    if (tank.aiTimer >= tank.aiDirectionChange) {
      tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      tank.aiDirectionChange = 800 + Math.random() * 1500;
      tank.aiTimer = 0;
    }
  }

  return computeMovement(tank, walls, playerTank, otherEnemies, 0.04);
}

/**
 * 防御 AI
 * - 尝试靠近基地
 * - 攻击靠近基地的玩家
 * - 不主动追击
 */
function updateDefensiveAI(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  dt: number
): AIDecision {
  tank.aiTimer += dt;

  // 找到基地位置
  const basePos = findBasePosition(walls);
  const distToBase = basePos ? distance(tank, basePos) : Infinity;
  const distToPlayer = playerTank.alive ? distance(tank, playerTank) : Infinity;

  // 如果玩家靠近基地（< 200px），优先攻击玩家
  if (playerTank.alive && distToPlayer < 200) {
    const dx = playerTank.x - tank.x;
    const dy = playerTank.y - tank.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }

    if (canShootTarget(tank, playerTank, walls)) {
      return { moveX: 0, moveY: 0, shouldFire: true };
    }
  }
  // 如果离基地较远，返回基地
  else if (basePos && distToBase > 150) {
    const dx = basePos.x - tank.x;
    const dy = basePos.y - tank.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }
  // 在基地附近巡逻
  else {
    if (tank.aiTimer >= tank.aiDirectionChange) {
      tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      tank.aiDirectionChange = 2000 + Math.random() * 3000;
      tank.aiTimer = 0;
    }
  }

  return computeMovement(tank, walls, playerTank, otherEnemies, 0.015);
}

/**
 * 狙击 AI
 * - 尽量保持距离
 * - 寻找直线射击角度
 * - 高精度瞄准
 */
function updateSniperAI(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  dt: number
): AIDecision {
  tank.aiTimer += dt;

  if (!playerTank.alive) {
    // 玩家死亡，随机移动
    if (tank.aiTimer >= tank.aiDirectionChange) {
      tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      tank.aiDirectionChange = 1000 + Math.random() * 2000;
      tank.aiTimer = 0;
    }
    return computeMovement(tank, walls, playerTank, otherEnemies, 0.01);
  }

  // 检查能否直接射击玩家
  if (canShootTarget(tank, playerTank, walls)) {
    // 瞄准射击
    return { moveX: 0, moveY: 0, shouldFire: true };
  }

  // 尝试找到好的射击角度
  const dx = playerTank.x - tank.x;
  const dy = playerTank.y - tank.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 如果太近，后退
  if (dist < 150) {
    // 远离玩家
    if (Math.abs(dx) > Math.abs(dy)) {
      tank.direction = dx > 0 ? Direction.LEFT : Direction.RIGHT;
    } else {
      tank.direction = dy > 0 ? Direction.UP : Direction.DOWN;
    }
  } else {
    // 侧向移动寻找射击角度
    tank.aiStateTimer += dt;
    if (tank.aiStateTimer > 1500) {
      tank.aiStateTimer = 0;
      // 交替水平/垂直移动
      if (Math.abs(dx) > Math.abs(dy)) {
        tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
      } else {
        tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      }
    }
  }

  // 低概率随机开火（试探）
  return computeMovement(tank, walls, playerTank, otherEnemies, 0.01);
}

/**
 * 计算移动和开火决策（通用碰撞检测）
 */
function computeMovement(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  fireChance: number
): AIDecision {
  let moveX = 0;
  let moveY = 0;

  switch (tank.direction) {
    case Direction.UP:    moveY = -tank.speed; break;
    case Direction.DOWN:  moveY = tank.speed; break;
    case Direction.LEFT:  moveX = -tank.speed; break;
    case Direction.RIGHT: moveX = tank.speed; break;
  }

  // 预检测碰撞
  const nextX = tank.x + moveX;
  const nextY = tank.y + moveY;
  const tankRect = {
    x: nextX,
    y: nextY,
    width: tank.width,
    height: tank.height,
  };

  let blocked = false;

  // 边界检测
  if (
    nextX < 0 ||
    nextY < 0 ||
    nextX + tank.width > GAME_CONFIG.CANVAS_WIDTH ||
    nextY + tank.height > GAME_CONFIG.CANVAS_HEIGHT
  ) {
    blocked = true;
  }

  // 墙体检测
  if (!blocked) {
    for (const wall of walls) {
      if (wall.destroyed || wall.type === WallType.WATER) continue;
      if (rectsOverlap(tankRect, wall.rect)) {
        blocked = true;
        break;
      }
    }
  }

  // 其他坦克检测
  if (!blocked) {
    for (const other of otherEnemies) {
      if (!other.alive || other === tank) continue;
      if (rectsOverlap(tankRect, other.rect)) {
        blocked = true;
        break;
      }
    }
    if (!blocked && playerTank.alive) {
      if (rectsOverlap(tankRect, playerTank.rect)) {
        blocked = true;
      }
    }
  }

  if (blocked) {
    tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    moveX = 0;
    moveY = 0;
  }

  const shouldFire = Math.random() < fireChance;

  return { moveX, moveY, shouldFire };
}

/** 找到基地的位置 */
function findBasePosition(walls: Wall[]): { x: number; y: number } | null {
  for (const wall of walls) {
    if (wall.type === WallType.BASE && !wall.destroyed) {
      return { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 };
    }
  }
  return null;
}

/** 计算两点距离 */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 检查坦克能否直接射击到目标（直线无障碍） */
function canShootTarget(tank: Tank, target: Tank, walls: Wall[]): boolean {
  if (!target.alive) return false;

  const margin = 5;
  const tankCenter = tank.center;
  const targetCenter = target.center;
  const dx = targetCenter.x - tankCenter.x;
  const dy = targetCenter.y - tankCenter.y;

  // 检查是否在一条直线上
  let isAligned = false;
  if (Math.abs(dx) < margin && dy !== 0) {
    isAligned = true;
  } else if (Math.abs(dy) < margin && dx !== 0) {
    isAligned = true;
  }

  if (!isAligned) return false;

  // 检查方向是否一致
  const dir = tank.direction;
  if (dir === Direction.UP && dy >= 0) return false;
  if (dir === Direction.DOWN && dy <= 0) return false;
  if (dir === Direction.LEFT && dx >= 0) return false;
  if (dir === Direction.RIGHT && dx <= 0) return false;

  // 检查路径上是否有墙壁阻挡
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) / 10;
  for (let i = 1; i < steps; i++) {
    const cx = tankCenter.x + (dx / steps) * i;
    const cy = tankCenter.y + (dy / steps) * i;
    for (const wall of walls) {
      if (wall.destroyed || wall.type === WallType.WATER) continue;
      if (
        cx >= wall.x &&
        cx <= wall.x + wall.width &&
        cy >= wall.y &&
        cy <= wall.y + wall.height
      ) {
        return false;
      }
    }
  }

  return true;
}

/** 矩形碰撞检测 */
export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
