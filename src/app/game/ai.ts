import { Tank } from './tank';
import { Direction, GAME_CONFIG, WallType } from './types';
import { Wall } from './wall';

const DIRECTIONS = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

/**
 * 简单的 AI：随机移动、遇到墙壁或边界转向、随机开火
 */
export function updateAI(
  tank: Tank,
  walls: Wall[],
  playerTank: Tank,
  otherEnemies: Tank[],
  dt: number
): { moveX: number; moveY: number; shouldFire: boolean } {
  if (!tank.alive) return { moveX: 0, moveY: 0, shouldFire: false };

  tank.aiTimer += dt;

  // 一定概率追踪玩家
  const trackPlayer = Math.random() < 0.3 && playerTank.alive;

  if (trackPlayer) {
    // 朝玩家方向移动
    const dx = playerTank.x - tank.x;
    const dy = playerTank.y - tank.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      tank.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      tank.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }

    // 如果可以直接射击玩家，开火
    if (canShootPlayer(tank, playerTank, walls)) {
      return { moveX: 0, moveY: 0, shouldFire: true };
    }
  } else {
    // 随机改变方向
    if (tank.aiTimer >= tank.aiDirectionChange) {
      tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      tank.aiDirectionChange = 1000 + Math.random() * 3000;
      tank.aiTimer = 0;
    }
  }

  // 计算移动偏移
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
    // 被阻挡时随机换方向
    tank.direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    moveX = 0;
    moveY = 0;
  }

  // 随机开火
  const shouldFire = Math.random() < 0.02;

  return { moveX, moveY, shouldFire };
}

/** 检查坦克能否直接射击到玩家（直线无障碍） */
function canShootPlayer(tank: Tank, player: Tank, walls: Wall[]): boolean {
  if (!player.alive) return false;

  const margin = 5;
  const tankCenter = tank.center;
  const playerCenter = player.center;
  const dx = playerCenter.x - tankCenter.x;
  const dy = playerCenter.y - tankCenter.y;

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
