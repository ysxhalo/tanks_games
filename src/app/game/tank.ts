import { Direction, Position, GAME_CONFIG, TankType, PowerUpType, PowerUpState } from './types';

export class Tank {
  x: number;
  y: number;
  width: number = GAME_CONFIG.TANK_SIZE;
  height: number = GAME_CONFIG.TANK_SIZE;
  direction: Direction = Direction.UP;
  speed: number;
  baseSpeed: number;
  color: string;
  turretColor: string;
  alive: boolean = true;
  cooldown: number = 0;
  fireCooldown: number;
  baseFireCooldown: number;
  isPlayer: boolean;
  tankType: TankType = TankType.NORMAL;

  /** 用于 AI 的计时 */
  aiTimer: number = 0;
  aiDirectionChange: number = 0;
  aiStateTimer: number = 0;

  /** 道具效果 */
  powerUps: PowerUpState[] = [];
  /** 散弹等级（拾取散弹道具后） */
  spreadLevel: number = 1;

  constructor(x: number, y: number, isPlayer: boolean, color?: string, tankType?: TankType) {
    this.x = x;
    this.y = y;
    this.isPlayer = isPlayer;
    this.tankType = tankType || (isPlayer ? TankType.NORMAL : TankType.NORMAL);

    this.baseSpeed = isPlayer ? GAME_CONFIG.TANK_SPEED : GAME_CONFIG.ENEMY_SPEED;
    this.speed = this.baseSpeed;
    this.baseFireCooldown = isPlayer ? GAME_CONFIG.PLAYER_FIRE_COOLDOWN : GAME_CONFIG.ENEMY_FIRE_INTERVAL;
    this.fireCooldown = this.baseFireCooldown;

    if (isPlayer) {
      this.color = '#4a9eff';
      this.turretColor = '#2a7fff';
    } else {
      this.color = color || '#ff4444';
      this.turretColor = '#cc2222';
    }
  }

  get center(): Position {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  get rect() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /** 设置方向 */
  setDirection(dir: Direction) {
    this.direction = dir;
  }

  /** 按当前方向移动 */
  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  /** 获取子弹生成位置（炮口） */
  getMuzzlePosition(): Position {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const offset = this.width / 2 + 2;

    switch (this.direction) {
      case Direction.UP:    return { x: cx, y: cy - offset };
      case Direction.DOWN:  return { x: cx, y: cy + offset };
      case Direction.LEFT:  return { x: cx - offset, y: cy };
      case Direction.RIGHT: return { x: cx + offset, y: cy };
    }
  }

  /** 获取散弹的多个炮口位置 */
  getSpreadMuzzlePositions(): Position[] {
    const main = this.getMuzzlePosition();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const offset = this.width / 2 + 2;
    const spreadOffset = 6;

    if (this.spreadLevel <= 1) return [main];

    const positions: Position[] = [main];

    switch (this.direction) {
      case Direction.UP:
        positions.push({ x: main.x - spreadOffset, y: main.y });
        positions.push({ x: main.x + spreadOffset, y: main.y });
        break;
      case Direction.DOWN:
        positions.push({ x: main.x - spreadOffset, y: main.y });
        positions.push({ x: main.x + spreadOffset, y: main.y });
        break;
      case Direction.LEFT:
        positions.push({ x: main.x, y: main.y - spreadOffset });
        positions.push({ x: main.x, y: main.y + spreadOffset });
        break;
      case Direction.RIGHT:
        positions.push({ x: main.x, y: main.y - spreadOffset });
        positions.push({ x: main.x, y: main.y + spreadOffset });
        break;
    }

    return positions.slice(0, this.spreadLevel);
  }

  /** 更新冷却 */
  updateCooldown(dt: number) {
    if (this.cooldown > 0) this.cooldown -= dt;

    // 更新道具状态
    for (const pu of this.powerUps) {
      pu.remaining -= dt;
    }
    this.powerUps = this.powerUps.filter(pu => pu.remaining > 0);

    // 更新速度加成
    this.updatePowerUpEffects();
  }

  /** 根据道具效果更新坦克属性 */
  private updatePowerUpEffects() {
    // 速度
    this.speed = this.baseSpeed;
    if (this.hasPowerUp(PowerUpType.SPEED)) {
      this.speed *= GAME_CONFIG.POWERUP_SPEED_MULTIPLIER;
    }

    // 散弹
    this.spreadLevel = this.hasPowerUp(PowerUpType.SPREAD) ? 3 : 1;
  }

  /** 添加道具效果 */
  addPowerUp(type: PowerUpType) {
    // 如果已存在同类型，刷新持续时间
    const existing = this.powerUps.find(pu => pu.type === type);
    if (existing) {
      existing.remaining = GAME_CONFIG.POWERUP_DURATION;
    } else {
      this.powerUps.push({ type, remaining: GAME_CONFIG.POWERUP_DURATION });
    }
    this.updatePowerUpEffects();
  }

  /** 检查是否有某道具效果 */
  hasPowerUp(type: PowerUpType): boolean {
    return this.powerUps.some(pu => pu.type === type);
  }

  /** 是否无敌 */
  isInvincible(): boolean {
    return this.hasPowerUp(PowerUpType.INVINCIBILITY);
  }

  /** 是否可以开火 */
  canFire(): boolean {
    return this.cooldown <= 0 && this.alive;
  }

  /** 开火后重置冷却 */
  fire() {
    this.cooldown = this.fireCooldown;
  }

  /** 获取坦克类型对应的颜色标识 */
  getTypeIndicator(): string {
    switch (this.tankType) {
      case TankType.AGGRESSIVE: return '★';
      case TankType.DEFENSIVE: return '●';
      case TankType.SNIPER: return '◆';
      default: return '';
    }
  }

  /** 绘制坦克 */
  draw(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // 根据方向旋转
    let angle = 0;
    switch (this.direction) {
      case Direction.UP:    break;
      case Direction.DOWN:  angle = Math.PI; break;
      case Direction.LEFT:  angle = -Math.PI / 2; break;
      case Direction.RIGHT: angle = Math.PI / 2; break;
    }
    ctx.rotate(angle);

    const hw = this.width / 2;
    const hh = this.height / 2;

    // 无敌光圈
    if (this.hasPowerUp(PowerUpType.INVINCIBILITY)) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(Date.now() * 0.01) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, hw + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 加速拖尾效果
    if (this.hasPowerUp(PowerUpType.SPEED)) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
    }

    // 履带（左右两条）
    ctx.fillStyle = '#333';
    ctx.fillRect(-hw, -hh, 6, this.height);
    ctx.fillRect(hw - 6, -hh, 6, this.height);

    // 主体
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-hw + 6, -hh + 4, this.width - 12, this.height - 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // 炮塔（圆形）
    ctx.fillStyle = this.turretColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 炮管
    ctx.fillStyle = this.turretColor;
    ctx.fillRect(-2, -hh + 2, 4, hh - 4);

    // 敌人类型标记
    if (!this.isPlayer) {
      const indicator = this.getTypeIndicator();
      if (indicator) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(indicator, 0, -hh - 2);
      }
    }

    ctx.restore();
  }
}
