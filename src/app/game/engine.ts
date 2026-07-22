import { Tank } from './tank';
import { Bullet } from './bullet';
import { Wall } from './wall';
import { PowerUp } from './powerup';
import { SoundManager } from './sound';
import { Leaderboard } from './leaderboard';
import { updateAI, rectsOverlap } from './ai';
import {
  generateWalls,
  getPlayerStart,
  getEnemySpawnPoints,
  getLevelConfig,
  getTotalLevels,
  getEnemyTypesForLevel,
} from './map';
import {
  Direction,
  GameState,
  KeysPressed,
  WallType,
  PowerUpType,
  TankType,
  GAME_CONFIG,
} from './types';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Tank;
  enemies: Tank[] = [];
  bullets: Bullet[] = [];
  walls: Wall[] = [];
  powerUps: PowerUp[] = [];
  soundManager: SoundManager;
  leaderboard: Leaderboard;
  state: GameState = GameState.PLAYING;

  // 计分
  score: number = 0;
  lives: number = GAME_CONFIG.PLAYER_LIVES;
  currentLevel: number = 1;

  // 输入
  keys: KeysPressed = { up: false, down: false, left: false, right: false, fire: false };

  // 循环
  lastTime: number = 0;
  animationId: number = 0;

  // 生成敌人
  enemySpawnQueue: number = GAME_CONFIG.ENEMY_COUNT;
  spawnTimer: number = 0;
  enemyColors: string[] = ['#ff4444', '#ff6600', '#ffaa00', '#ff22aa', '#dd44ff', '#44ff44'];
  enemyTypeQueue: TankType[] = [];

  // 关卡过渡
  levelTransitionTimer: number = 0;
  levelTransitionDuration: number = 3000;

  // 名字输入
  playerName: string = '';
  nameInputCursor: boolean = true;
  nameInputTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    this.player = new Tank(0, 0, true);
    this.soundManager = new SoundManager();
    this.leaderboard = new Leaderboard();
    this.init();
  }

  init() {
    this.currentLevel = 1;
    this.score = 0;
    this.lives = GAME_CONFIG.PLAYER_LIVES;
    this.setupLevel(this.currentLevel);
    this.state = GameState.PLAYING;
  }

  /** 设置关卡 */
  setupLevel(level: number) {
    const config = getLevelConfig(level);

    // 生成地图
    this.walls = generateWalls(config.mapLayout);
    this.bullets = [];
    this.enemies = [];
    this.powerUps = [];
    this.enemySpawnQueue = config.enemyCount;
    this.spawnTimer = 0;

    // 设置敌人类型队列
    this.enemyTypeQueue = getEnemyTypesForLevel(level);

    // 放置玩家
    const playerStart = getPlayerStart(config.mapLayout);
    this.player = new Tank(playerStart.x, playerStart.y, true);
    this.player.direction = Direction.UP;

    // 更新敌人速度配置
    this.enemySpeedOverride = config.enemySpeed;
    this.enemyFireIntervalOverride = config.enemyFireInterval;

    // 初始生成2个敌人
    this.spawnInitialEnemies();

    this.state = GameState.PLAYING;
  }

  // 用于传递关卡配置到生成逻辑
  private enemySpeedOverride: number = GAME_CONFIG.ENEMY_SPEED;
  private enemyFireIntervalOverride: number = GAME_CONFIG.ENEMY_FIRE_INTERVAL;

  spawnInitialEnemies() {
    const spawnPoints = getEnemySpawnPoints();
    for (let i = 0; i < Math.min(2, spawnPoints.length); i++) {
      this.spawnEnemy(spawnPoints[i]);
      this.enemySpawnQueue--;
    }
  }

  spawnEnemy(pos: { x: number; y: number }) {
    const colorIndex = this.enemies.length % this.enemyColors.length;

    // 从队列中取出类型
    let tankType = TankType.NORMAL;
    if (this.enemyTypeQueue.length > 0) {
      tankType = this.enemyTypeQueue.shift()!;
    }

    const enemy = new Tank(pos.x, pos.y, false, this.enemyColors[colorIndex], tankType);
    enemy.direction = Direction.DOWN;

    // 应用关卡配置
    enemy.baseSpeed = this.enemySpeedOverride;
    enemy.speed = this.enemySpeedOverride;
    enemy.baseFireCooldown = this.enemyFireIntervalOverride;
    enemy.fireCooldown = this.enemyFireIntervalOverride;

    // 激进型射速更快
    if (tankType === TankType.AGGRESSIVE) {
      enemy.fireCooldown = this.enemyFireIntervalOverride * 0.6;
      enemy.baseFireCooldown = enemy.fireCooldown;
    }

    // 检查出生点是否被占用
    for (const other of this.enemies) {
      if (!other.alive) continue;
      if (rectsOverlap(enemy.rect, other.rect)) {
        // 放回类型
        this.enemyTypeQueue.unshift(tankType);
        return;
      }
    }
    this.enemies.push(enemy);
  }

  /** 游戏主循环 */
  gameLoop(timestamp: number) {
    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    switch (this.state) {
      case GameState.PLAYING:
        this.update(dt);
        break;
      case GameState.LEVEL_COMPLETE:
        this.updateLevelTransition(dt);
        break;
      case GameState.NAME_INPUT:
        this.updateNameInput(dt);
        break;
      case GameState.PAUSED:
        // 暂停时不做任何更新
        break;
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
    this.soundManager.destroy();
  }

  /** 更新逻辑 */
  update(dt: number) {
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePowerUps(dt);
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

      // AI 决定开火
      if (ai.shouldFire && enemy.canFire()) {
        this.fireBullet(enemy);
      }

      // 额外开火机会
      if (enemy.canFire()) {
        let extraFireChance = 0.015;
        if (enemy.tankType === TankType.AGGRESSIVE) extraFireChance = 0.03;
        if (enemy.tankType === TankType.SNIPER) extraFireChance = 0.025;
        if (Math.random() < extraFireChance) {
          this.fireBullet(enemy);
        }
      }
    }
  }

  /** 更新子弹 */
  updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      bullet.update();
    }
    this.bullets = this.bullets.filter(b => b.active);
  }

  /** 更新道具 */
  updatePowerUps(dt: number) {
    for (const pu of this.powerUps) {
      pu.update(dt);
    }
    this.powerUps = this.powerUps.filter(pu => !pu.collected);
  }

  /** 发射子弹（支持散弹） */
  fireBullet(tank: Tank) {
    if (!tank.canFire()) return;

    // 限制同时存在的子弹数量
    const tankBullets = this.bullets.filter(
      b => b.isPlayerBullet === tank.isPlayer && b.active
    );
    if (tank.isPlayer && tankBullets.length >= GAME_CONFIG.MAX_BULLETS) return;

    const muzzlePositions = tank.getSpreadMuzzlePositions();

    for (const pos of muzzlePositions) {
      const bullet = new Bullet(pos.x, pos.y, tank.direction, tank.isPlayer);
      this.bullets.push(bullet);
    }

    tank.fire();
    this.soundManager.playShoot();
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
      if (wall.type === WallType.WATER) {
        if (rectsOverlap(tankRect, wall.rect)) return;
      } else {
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

      // 子弹 vs 墙体（水域不阻挡子弹）
      for (const wall of this.walls) {
        if (wall.destroyed) continue;
        if (wall.type === WallType.WATER) continue; // 子弹穿过水域
        if (rectsOverlap(bullet.rect, wall.rect)) {
          bullet.active = false;

          if (wall.type === WallType.BRICK) {
            wall.destroyed = true;
            this.soundManager.playExplosion();
          } else if (wall.type === WallType.BASE) {
            wall.destroyed = true;
            this.state = GameState.GAME_OVER;
            this.soundManager.playExplosion();
            this.soundManager.playGameOver();
          }
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

            // 额外加分：根据敌人类型
            switch (enemy.tankType) {
              case TankType.AGGRESSIVE: this.score += 50; break;
              case TankType.DEFENSIVE: this.score += 50; break;
              case TankType.SNIPER: this.score += 100; break;
            }

            this.soundManager.playExplosion();

            // 概率掉落道具
            if (Math.random() < GAME_CONFIG.POWERUP_DROP_CHANCE) {
              this.spawnPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            }
            break;
          }
        }
      } else {
        // 敌人子弹击中玩家
        if (this.player.alive && rectsOverlap(bullet.rect, this.player.rect)) {
          // 无敌状态免疫伤害
          if (this.player.isInvincible()) {
            bullet.active = false;
            continue;
          }

          bullet.active = false;

          // 检查散弹道具是否被击中（散弹状态移除）
          if (this.player.hasPowerUp(PowerUpType.SPREAD)) {
            this.player.powerUps = this.player.powerUps.filter(
              pu => pu.type !== PowerUpType.SPREAD
            );
            // 不扣命，只移除散弹
            continue;
          }

          this.player.alive = false;
          this.lives--;

          this.soundManager.playExplosion();

          // 如果有命，重生
          if (this.lives > 0) {
            const config = getLevelConfig(this.currentLevel);
            const start = getPlayerStart(config.mapLayout);
            this.player.x = start.x;
            this.player.y = start.y;
            this.player.alive = true;
            this.player.direction = Direction.UP;
            // 重生后短暂无敌
            this.player.addPowerUp(PowerUpType.INVINCIBILITY);
            this.player.powerUps[0].remaining = 1500; // 1.5秒无敌
          } else {
            this.state = GameState.GAME_OVER;
            this.soundManager.playGameOver();
          }
        }
      }
    }

    // 玩家 vs 道具碰撞
    if (this.player.alive) {
      for (const pu of this.powerUps) {
        if (pu.collected) continue;
        if (rectsOverlap(this.player.rect, pu.rect)) {
          pu.collected = true;
          this.collectPowerUp(pu.type);
        }
      }
    }
  }

  /** 生成道具 */
  spawnPowerUp(x: number, y: number) {
    const type = PowerUp.randomType();
    const pu = new PowerUp(x, y, type);
    this.powerUps.push(pu);
  }

  /** 收集道具 */
  collectPowerUp(type: PowerUpType) {
    this.soundManager.playPowerUp();

    switch (type) {
      case PowerUpType.SPEED:
        this.player.addPowerUp(PowerUpType.SPEED);
        break;
      case PowerUpType.INVINCIBILITY:
        this.player.addPowerUp(PowerUpType.INVINCIBILITY);
        break;
      case PowerUpType.SPREAD:
        this.player.addPowerUp(PowerUpType.SPREAD);
        break;
      case PowerUpType.EXTRA_LIFE:
        this.lives++;
        break;
    }
  }

  /** 生成敌人波次 */
  spawnEnemyWave(dt: number) {
    if (this.enemySpawnQueue <= 0) return;

    this.spawnTimer += dt;
    const spawnInterval = Math.max(2000, 3000 - this.currentLevel * 200);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;

      const spawnPoints = getEnemySpawnPoints();
      const available = spawnPoints.filter(sp => {
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
    // 所有敌人被消灭且没有待生成的
    const allEnemiesDead = this.enemies.every(e => !e.alive);
    if (this.enemySpawnQueue <= 0 && allEnemiesDead) {
      if (this.currentLevel >= getTotalLevels()) {
        // 全部通关
        this.state = GameState.VICTORY;
        this.soundManager.playVictory();
      } else {
        // 进入下一关
        this.state = GameState.LEVEL_COMPLETE;
        this.levelTransitionTimer = 0;
        this.soundManager.playLevelComplete();
      }
    }
  }

  /** 更新关卡过渡 */
  updateLevelTransition(dt: number) {
    this.levelTransitionTimer += dt;
    if (this.levelTransitionTimer >= this.levelTransitionDuration) {
      this.currentLevel++;
      this.setupLevel(this.currentLevel);
    }
  }

  /** 更新名字输入 */
  updateNameInput(dt: number) {
    this.nameInputTimer += dt;
    if (this.nameInputTimer > 500) {
      this.nameInputCursor = !this.nameInputCursor;
      this.nameInputTimer = 0;
    }
  }

  /** 提交分数到排行榜 */
  submitScore() {
    const name = this.playerName.trim() || '玩家';
    const rank = this.leaderboard.addScore(name, this.score, this.currentLevel);
    this.playerName = '';
    this.state = GameState.LEADERBOARD;
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

    // 绘制道具
    for (const pu of this.powerUps) {
      pu.draw(ctx);
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
    // --- 顶部信息栏 ---
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, 36);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillText(`🏆 ${this.score}`, 12, 18);

    ctx.textAlign = 'center';
    const enemiesLeft = this.enemySpawnQueue + this.enemies.filter(e => e.alive).length;
    ctx.fillStyle = '#ffdd57';
    ctx.fillText(`第 ${this.currentLevel} 关`, GAME_CONFIG.CANVAS_WIDTH / 2 - 80, 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(`👾 ${enemiesLeft}`, GAME_CONFIG.CANVAS_WIDTH / 2 + 20, 18);

    // 音效开关
    ctx.textAlign = 'right';
    ctx.fillStyle = this.soundManager.isEnabled() ? '#2ecc71' : '#e74c3c';
    ctx.fillText(this.soundManager.isEnabled() ? '🔊' : '🔇', 60, 18);

    ctx.textAlign = 'right';
    let livesStr = '';
    for (let i = 0; i < this.lives; i++) livesStr += '❤️';
    ctx.fillText(livesStr, GAME_CONFIG.CANVAS_WIDTH - 12, 18);

    // 增益效果指示
    if (this.player.alive) {
      let buffStr = '';
      if (this.player.hasPowerUp(PowerUpType.SPEED)) buffStr += '⚡';
      if (this.player.hasPowerUp(PowerUpType.INVINCIBILITY)) buffStr += '🛡️';
      if (this.player.hasPowerUp(PowerUpType.SPREAD)) buffStr += '💥';
      if (buffStr) {
        ctx.textAlign = 'left';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = '#ffdd57';
        ctx.fillText(buffStr, 120, 18);
      }
    }

    // --- 不同状态的叠加 UI ---
    if (this.state === GameState.LEVEL_COMPLETE) {
      this.drawLevelComplete(ctx);
    } else if (this.state === GameState.GAME_OVER) {
      this.drawGameOver(ctx);
    } else if (this.state === GameState.VICTORY) {
      this.drawVictory(ctx);
    } else if (this.state === GameState.NAME_INPUT) {
      this.drawNameInput(ctx);
    } else if (this.state === GameState.LEADERBOARD) {
      this.drawLeaderboard(ctx);
    } else if (this.state === GameState.PAUSED) {
      this.drawPaused(ctx);
    }
  }

  /** 绘制关卡完成 */
  drawLevelComplete(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🎉 第 ${this.currentLevel} 关通过！`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 30);

    ctx.fillStyle = '#fff';
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`得分: ${this.score}`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 20);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px "Courier New", monospace';
    const progress = Math.min(1, this.levelTransitionTimer / this.levelTransitionDuration);
    ctx.fillText(`即将进入第 ${this.currentLevel + 1} 关...`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 60);

    // 进度条
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(GAME_CONFIG.CANVAS_WIDTH / 2 - 100, GAME_CONFIG.CANVAS_HEIGHT / 2 + 85, 200, 8);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(GAME_CONFIG.CANVAS_WIDTH / 2 - 100, GAME_CONFIG.CANVAS_HEIGHT / 2 + 85, 200 * progress, 8);
  }

  /** 绘制游戏结束 */
  drawGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀 游戏结束', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 60);

    ctx.fillStyle = '#fff';
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText(
      `到达关卡: ${this.currentLevel}  |  最终得分: ${this.score}`,
      GAME_CONFIG.CANVAS_WIDTH / 2,
      GAME_CONFIG.CANVAS_HEIGHT / 2
    );

    // 检查是否能进排行榜
    if (this.leaderboard.isHighScore(this.score)) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('🏆 新的高分记录！', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 40);

      ctx.fillStyle = '#aaa';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('按 Enter 输入名字', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 75);
      ctx.fillText('按 空格 直接重新开始', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 100);
    } else {
      ctx.fillStyle = '#aaa';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('按 Enter 重新开始', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 45);
    }
  }

  /** 绘制胜利画面 */
  drawVictory(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 全部通关！', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 60);

    ctx.fillStyle = '#fff';
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText(
      `最终得分: ${this.score}`,
      GAME_CONFIG.CANVAS_WIDTH / 2,
      GAME_CONFIG.CANVAS_HEIGHT / 2
    );

    if (this.leaderboard.isHighScore(this.score)) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('🏆 新的高分记录！', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 40);

      ctx.fillStyle = '#aaa';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('按 Enter 输入名字', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 75);
      ctx.fillText('按 空格 查看排行榜', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 100);
    } else {
      ctx.fillStyle = '#aaa';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('按 Enter 查看排行榜', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 40);
    }
  }

  /** 绘制名字输入 */
  drawNameInput(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 高分记录！', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 80);

    ctx.fillStyle = '#fff';
    ctx.font = '18px "Courier New", monospace';
    ctx.fillText(`得分: ${this.score}`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 40);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('请输入你的名字:', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);

    // 输入框
    const inputWidth = 200;
    const inputHeight = 36;
    const inputX = GAME_CONFIG.CANVAS_WIDTH / 2 - inputWidth / 2;
    const inputY = GAME_CONFIG.CANVAS_HEIGHT / 2 + 20;

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);

    ctx.fillStyle = '#fff';
    ctx.font = '20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayName = this.playerName + (this.nameInputCursor ? '|' : ' ');
    ctx.fillText(displayName, GAME_CONFIG.CANVAS_WIDTH / 2, inputY + inputHeight / 2);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('按 Enter 确认', GAME_CONFIG.CANVAS_WIDTH / 2, inputY + inputHeight + 30);
  }

  /** 绘制暂停画面 */
  drawPaused(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏸ 暂停', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 20);

    ctx.fillStyle = '#aaa';
    ctx.font = '18px "Courier New", monospace';
    ctx.fillText('按 P 或 Escape 继续', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 30);
  }

  /** 绘制排行榜 */
  drawLeaderboard(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 排行榜', GAME_CONFIG.CANVAS_WIDTH / 2, 50);

    const scores = this.leaderboard.getTopScores();

    if (scores.length === 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('暂无记录', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
    } else {
      // 表头
      ctx.fillStyle = '#888';
      ctx.font = '14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('排名', GAME_CONFIG.CANVAS_WIDTH / 2 - 180, 90);
      ctx.fillText('名字', GAME_CONFIG.CANVAS_WIDTH / 2 - 100, 90);
      ctx.fillText('得分', GAME_CONFIG.CANVAS_WIDTH / 2 + 50, 90);
      ctx.fillText('关卡', GAME_CONFIG.CANVAS_WIDTH / 2 + 130, 90);

      scores.forEach((entry, i) => {
        const y = 125 + i * 35;
        const isNew = false; // Could track if this is the newly added score

        ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#aaa';
        ctx.font = i < 3 ? 'bold 16px "Courier New", monospace' : '16px "Courier New", monospace';
        ctx.textAlign = 'left';

        const medals = ['🥇', '🥈', '🥉'];
        const rankStr = i < 3 ? medals[i] : `#${i + 1}`;
        ctx.fillText(rankStr, GAME_CONFIG.CANVAS_WIDTH / 2 - 180, y);
        ctx.fillText(entry.name, GAME_CONFIG.CANVAS_WIDTH / 2 - 100, y);
        ctx.fillText(String(entry.score), GAME_CONFIG.CANVAS_WIDTH / 2 + 50, y);
        ctx.fillText(`第${entry.level}关`, GAME_CONFIG.CANVAS_WIDTH / 2 + 130, y);
      });
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('按 Enter 重新开始', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 40);
  }

  /** 处理键盘事件 */
  handleKeyDown(e: KeyboardEvent) {
    // 名字输入模式
    if (this.state === GameState.NAME_INPUT) {
      if (e.key === 'Enter') {
        this.submitScore();
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && this.playerName.length < 8) {
        this.playerName += e.key;
        e.preventDefault();
        return;
      }
      return;
    }

    // 游戏结束/胜利时特殊处理
    if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      if (e.key === 'Enter') {
        // 检查是否能进排行榜
        if (this.leaderboard.isHighScore(this.score)) {
          this.state = GameState.NAME_INPUT;
          this.playerName = '';
          this.nameInputTimer = 0;
          this.nameInputCursor = true;
        } else if (this.state === GameState.VICTORY) {
          this.state = GameState.LEADERBOARD;
        } else {
          this.init();
        }
        e.preventDefault();
        return;
      }
      if (e.key === ' ' && this.state === GameState.GAME_OVER) {
        this.init();
        e.preventDefault();
        return;
      }
      if (e.key === ' ' && this.state === GameState.VICTORY) {
        this.state = GameState.LEADERBOARD;
        e.preventDefault();
        return;
      }
    }

    // 暂停切换
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
      } else if (this.state === GameState.PAUSED) {
        this.state = GameState.PLAYING;
      }
      e.preventDefault();
      return;
    }

    // 暂停时除继续外不接受其他操作
    if (this.state === GameState.PAUSED) return;

    // 排行榜模式
    if (this.state === GameState.LEADERBOARD) {
      if (e.key === 'Enter') {
        this.init();
        e.preventDefault();
        return;
      }
    }

    // 游戏操作
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': this.keys.up = true; e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': this.keys.down = true; e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = true; e.preventDefault(); break;
      case ' ': this.keys.fire = true; e.preventDefault(); break;
      case 'm': case 'M':
        this.soundManager.toggle();
        e.preventDefault();
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
