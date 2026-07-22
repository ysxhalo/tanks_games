import { Tank } from './tank';
import { Bullet } from './bullet';
import { Wall } from './wall';
import { updateAI, rectsOverlap } from './ai';
import { generateWalls, getPlayerStart, getEnemySpawnPoints, COLS, ROWS } from './map';
import {
  Direction,
  GameState,
  KeysPressed,
  WallType,
  GAME_CONFIG,
} from './types';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Tank;
  enemies: Tank[] = [];
  bullets: Bullet[] = [];
  walls: Wall[] = [];
  state: GameState = GameState.PLAYING;
  score: number = 0;
  lives: number = GAME_CONFIG.PLAYER_LIVES;
  keys: KeysPressed = { up: false, down: false, left: false, right: false, fire: false };
  lastTime: number = 0;
  animationId: number = 0;
  enemySpawnQueue: number = GAME_CONFIG.ENEMY_COUNT;
  spawnTimer: number = 0;
  enemyColors: string[] = ['#ff4444', '#ff6600', '#ffaa00', '#ff22aa', '#dd44ff', '#44ff44'];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    this.player = new Tank(0, 0, true);
    this.init();
  }

  init() {
    // 重置所有状态
    this.walls = generateWalls();
    this.bullets = [];
    this.enemies = [];
    this.score = 0;
    this.lives = GAME_CONFIG.PLAYER_LIVES;
    this.state = GameState.PLAYING;
    this.enemySpawnQueue = GAME_CONFIG.ENEMY_COUNT;
    this.spawnTimer = 0;

    // 放置玩家
    const playerStart = getPlayerStart();
    this.player = new Tank(playerStart.x, playerStart.y, true);
    this.player.direction = Direction.UP;

    // 初始生成一些敌人
    this.spawnInitialEnemies();
  }

  spawnInitialEnemies() {
    const spawnPoints = getEnemySpawnPoints();
    // 初始生成2个敌人
    for (let i = 0; i < Math.min(2, spawnPoints.length); i++) {
      this.spawnEnemy(spawnPoints[i]);
      this.enemySpawnQueue--;
    }
  }

  spawnEnemy(pos: { x: number; y: number }) {
    const colorIndex = this.enemies.length % this.enemyColors.length;
    const enemy = new Tank(pos.x, pos.y, false, this.enemyColors[colorIndex]);
    enemy.direction = Direction.DOWN;
    // 检查出生点是否被占用
    for (const other of this.enemies) {
      if (!other.alive) continue;
      if (rectsOverlap(enemy.rect, other.rect)) return; // 被占用，暂时不生成
    }
    this.enemies.push(enemy);
  }

  /** 游戏主循环 */
  gameLoop(timestamp: number) {
    const dt = Math.min(timestamp - this.lastTime, 50); // 限制最大 dt 为 50ms
    this.lastTime = timestamp;

    if (this.state === GameState.PLAYING) {
      this.update(dt);
    }

    this.render();
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  start() {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  /** 更新逻辑 */
  update(dt: number) {
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.checkCollisions();
    this.spawnEnemyWave(dt);
    this.checkGameEnd();
  }

  /** 更新玩家 */
  updatePlayer(dt: number) {
    if (!this.player.alive) return;

    this.player.updateCooldown(dt);

    let dx = 0;
    let dy = 0;

    if (this.keys.up) { this.player.direction = Direction.UP; dy = -this.player.speed; }
    else if (this.keys.down) { this.player.direction = Direction.DOWN; dy = this.player.speed; }
    else if (this.keys.left) { this.player.direction = Direction.LEFT; dx = -this.player.speed; }
    else if (this.keys.right) { this.player.direction = Direction.RIGHT; dx = this.player.speed; }

    if (dx !== 0 || dy !== 0) {
      this.tryMoveTank(this.player, dx, dy);
    }

    // 开火
    if (this.keys.fire && this.player.canFire()) {
      this.fireBullet(this.player);
    }
  }

  /** 更新敌人 AI */
  updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      enemy.updateCooldown(dt);

      const otherEnemies = this.enemies.filter(e => e !== enemy && e.alive);

      const ai = updateAI(enemy, this.walls, this.player, otherEnemies, dt);

      if (ai.moveX !== 0 || ai.moveY !== 0) {
        this.tryMoveTank(enemy, ai.moveX, ai.moveY);
      }

      if (ai.shouldFire && enemy.canFire()) {
        this.fireBullet(enemy);
      }

      // 直接开火（冷却好了就开火）
      if (enemy.canFire() && Math.random() < 0.015) {
        this.fireBullet(enemy);
      }
    }
  }

  /** 更新子弹 */
  updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      bullet.update();
    }
    // 移除失活子弹
    this.bullets = this.bullets.filter(b => b.active);
  }

  /** 发射子弹 */
  fireBullet(tank: Tank) {
    if (!tank.canFire()) return;

    // 限制同时存在的子弹数量
    const tankBullets = this.bullets.filter(
      b => b.isPlayerBullet === tank.isPlayer && b.active
    );
    if (tank.isPlayer && tankBullets.length >= GAME_CONFIG.MAX_BULLETS) return;

    const muzzle = tank.getMuzzlePosition();
    const bullet = new Bullet(muzzle.x, muzzle.y, tank.direction, tank.isPlayer);
    this.bullets.push(bullet);
    tank.fire();
  }

  /** 尝试移动坦克（带碰撞检测） */
  tryMoveTank(tank: Tank, dx: number, dy: number) {
    const newX = tank.x + dx;
    const newY = tank.y + dy;

    const tankRect = {
      x: newX,
      y: newY,
      width: tank.width,
      height: tank.height,
    };

    // 边界检测
    if (
      newX < 0 ||
      newY < 0 ||
      newX + tank.width > GAME_CONFIG.CANVAS_WIDTH ||
      newY + tank.height > GAME_CONFIG.CANVAS_HEIGHT
    ) {
      return;
    }

    // 墙体碰撞检测
    for (const wall of this.walls) {
      if (wall.destroyed) continue;
      // 水域阻挡坦克（但子弹可以通过）
      if (wall.type === WallType.WATER && !tank.isPlayer) {
        // 敌人也不能通过水域
        if (rectsOverlap(tankRect, wall.rect)) return;
      } else if (wall.type !== WallType.WATER) {
        if (rectsOverlap(tankRect, wall.rect)) return;
      }
      // 玩家也不能通过水域
      if (wall.type === WallType.WATER && tank.isPlayer) {
        if (rectsOverlap(tankRect, wall.rect)) return;
      }
    }

    // 坦克间碰撞检测
    if (tank.isPlayer) {
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (rectsOverlap(tankRect, enemy.rect)) return;
      }
    } else {
      if (this.player.alive && rectsOverlap(tankRect, this.player.rect)) return;
      for (const other of this.enemies) {
        if (!other.alive || other === tank) continue;
        if (rectsOverlap(tankRect, other.rect)) return;
      }
    }

    tank.move(dx, dy);
  }

  /** 检查所有碰撞 */
  checkCollisions() {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      // 子弹 vs 墙体
      for (const wall of this.walls) {
        if (wall.destroyed) continue;
        if (rectsOverlap(bullet.rect, wall.rect)) {
          bullet.active = false;

          if (wall.type === WallType.BRICK) {
            wall.destroyed = true;
          } else if (wall.type === WallType.BASE) {
            wall.destroyed = true;
            this.state = GameState.GAME_OVER;
          }
          // 钢墙和水域不受子弹影响
          break;
        }
      }

      if (!bullet.active) continue;

      // 子弹 vs 坦克
      if (bullet.isPlayerBullet) {
        // 玩家子弹击中敌人
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (rectsOverlap(bullet.rect, enemy.rect)) {
            bullet.active = false;
            enemy.alive = false;
            this.score += 100;
            break;
          }
        }
      } else {
        // 敌人子弹击中玩家
        if (this.player.alive && rectsOverlap(bullet.rect, this.player.rect)) {
          bullet.active = false;
          this.player.alive = false;
          this.lives--;

          // 如果有命，重生
          if (this.lives > 0) {
            const start = getPlayerStart();
            this.player.x = start.x;
            this.player.y = start.y;
            this.player.alive = true;
            this.player.direction = Direction.UP;
          } else {
            this.state = GameState.GAME_OVER;
          }
        }
      }
    }
  }

  /** 生成敌人波次 */
  spawnEnemyWave(dt: number) {
    if (this.enemySpawnQueue <= 0) return;

    this.spawnTimer += dt;
    if (this.spawnTimer >= 3000) {
      this.spawnTimer = 0;

      const spawnPoints = getEnemySpawnPoints();
      const available = spawnPoints.filter(sp => {
        // 检查出生点是否被占用
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - sp.x) < GAME_CONFIG.TILE_SIZE &&
              Math.abs(enemy.y - sp.y) < GAME_CONFIG.TILE_SIZE) {
            return false;
          }
        }
        return true;
      });

      if (available.length > 0) {
        const pos = available[Math.floor(Math.random() * available.length)];
        this.spawnEnemy(pos);
        this.enemySpawnQueue--;
      }
    }
  }

  /** 检查游戏结束条件 */
  checkGameEnd() {
    // 所有敌人都被消灭且没有待生成的
    if (this.enemySpawnQueue <= 0 && this.enemies.every(e => !e.alive)) {
      this.state = GameState.VICTORY;
    }
  }

  /** 渲染 */
  render() {
    const ctx = this.ctx;

    // 清屏
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // 绘制网格
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GAME_CONFIG.CANVAS_WIDTH; x += GAME_CONFIG.TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= GAME_CONFIG.CANVAS_HEIGHT; y += GAME_CONFIG.TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // 绘制墙体
    for (const wall of this.walls) {
      wall.draw(ctx);
    }

    // 绘制坦克
    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
    this.player.draw(ctx);

    // 绘制子弹
    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }

    // 绘制 UI
    this.drawUI(ctx);
  }

  /** 绘制 UI */
  drawUI(ctx: CanvasRenderingContext2D) {
    // 顶部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, 36);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillText(`🏆 得分: ${this.score}`, 12, 18);

    ctx.textAlign = 'center';
    const enemiesLeft = this.enemySpawnQueue + this.enemies.filter(e => e.alive).length;
    ctx.fillText(`👾 剩余敌人: ${enemiesLeft}`, GAME_CONFIG.CANVAS_WIDTH / 2, 18);

    ctx.textAlign = 'right';
    let livesStr = '';
    for (let i = 0; i < this.lives; i++) livesStr += '❤️';
    ctx.fillText(livesStr, GAME_CONFIG.CANVAS_WIDTH - 12, 18);

    // 游戏结束 / 胜利界面
    if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

      ctx.fillStyle = this.state === GameState.VICTORY ? '#2ecc71' : '#e74c3c';
      ctx.font = 'bold 48px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.state === GameState.VICTORY ? '🎉 胜利！' : '💀 游戏结束',
        GAME_CONFIG.CANVAS_WIDTH / 2,
        GAME_CONFIG.CANVAS_HEIGHT / 2 - 40
      );

      ctx.fillStyle = '#fff';
      ctx.font = '20px "Courier New", monospace';
      ctx.fillText(
        `最终得分: ${this.score}`,
        GAME_CONFIG.CANVAS_WIDTH / 2,
        GAME_CONFIG.CANVAS_HEIGHT / 2 + 20
      );

      ctx.fillStyle = '#aaa';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText(
        '按 Enter 重新开始',
        GAME_CONFIG.CANVAS_WIDTH / 2,
        GAME_CONFIG.CANVAS_HEIGHT / 2 + 60
      );
    }
  }

  /** 处理键盘事件 */
  handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': this.keys.up = true; e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': this.keys.down = true; e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = true; e.preventDefault(); break;
      case ' ': this.keys.fire = true; e.preventDefault(); break;
      case 'Enter':
        if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
          this.init();
        }
        break;
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': this.keys.up = false; e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': this.keys.down = false; e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = false; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = false; e.preventDefault(); break;
      case ' ': this.keys.fire = false; e.preventDefault(); break;
    }
  }
}
