import { Direction, Position, GAME_CONFIG } from './types';

export class Tank {
  x: number;
  y: number;
  width: number = GAME_CONFIG.TANK_SIZE;
  height: number = GAME_CONFIG.TANK_SIZE;
  direction: Direction = Direction.UP;
  speed: number;
  color: string;
  turretColor: string;
  alive: boolean = true;
  cooldown: number = 0;
  fireCooldown: number;
  isPlayer: boolean;
  /** 用于 AI 的计时 */
  aiTimer: number = 0;
  aiDirectionChange: number = 0;

  constructor(x: number, y: number, isPlayer: boolean, color?: string) {
    this.x = x;
    this.y = y;
    this.isPlayer = isPlayer;
    this.speed = isPlayer ? GAME_CONFIG.TANK_SPEED : GAME_CONFIG.ENEMY_SPEED;
    this.fireCooldown = isPlayer ? GAME_CONFIG.PLAYER_FIRE_COOLDOWN : GAME_CONFIG.ENEMY_FIRE_INTERVAL;

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

  /** 更新冷却 */
  updateCooldown(dt: number) {
    if (this.cooldown > 0) this.cooldown -= dt;
  }

  /** 是否可以开火 */
  canFire(): boolean {
    return this.cooldown <= 0 && this.alive;
  }

  /** 开火后重置冷却 */
  fire() {
    this.cooldown = this.fireCooldown;
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

    // 坦克主体（圆角矩形）
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;

    // 履带（左右两条）
    ctx.fillStyle = '#333';
    ctx.fillRect(-hw, -hh, 6, this.height);
    ctx.fillRect(hw - 6, -hh, 6, this.height);

    // 主体
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-hw + 6, -hh + 4, this.width - 12, this.height - 8, 3);
    ctx.fill();
    ctx.stroke();

    // 炮塔（圆形）
    ctx.fillStyle = this.turretColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 炮管
    ctx.fillStyle = this.turretColor;
    ctx.fillRect(-2, -hh + 2, 4, hh - 4);

    ctx.restore();
  }
}
