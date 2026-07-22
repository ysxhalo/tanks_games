import { PowerUpType, Position, GAME_CONFIG } from './types';

export class PowerUp {
  x: number;
  y: number;
  size: number = GAME_CONFIG.POWERUP_SIZE;
  type: PowerUpType;
  collected: boolean = false;
  /** 浮动动画偏移 */
  private bounceOffset: number = 0;
  /** 旋转角度 */
  private angle: number = 0;

  /** 颜色映射 */
  private static COLORS: Record<PowerUpType, string> = {
    [PowerUpType.SPEED]: '#00e5ff',
    [PowerUpType.INVINCIBILITY]: '#ffd700',
    [PowerUpType.SPREAD]: '#ff6b6b',
    [PowerUpType.EXTRA_LIFE]: '#2ecc71',
  };

  /** 图标映射 */
  private static ICONS: Record<PowerUpType, string> = {
    [PowerUpType.SPEED]: '⚡',
    [PowerUpType.INVINCIBILITY]: '🛡️',
    [PowerUpType.SPREAD]: '💥',
    [PowerUpType.EXTRA_LIFE]: '❤️',
  };

  /** 标签映射 */
  private static LABELS: Record<PowerUpType, string> = {
    [PowerUpType.SPEED]: '加速',
    [PowerUpType.INVINCIBILITY]: '无敌',
    [PowerUpType.SPREAD]: '散弹',
    [PowerUpType.EXTRA_LIFE]: '加命',
  };

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x - this.size / 2;
    this.y = y - this.size / 2;
    this.type = type;
  }

  get center(): Position {
    return {
      x: this.x + this.size / 2,
      y: this.y + this.size / 2,
    };
  }

  get rect() {
    return {
      x: this.x,
      y: this.y + this.bounceOffset,
      width: this.size,
      height: this.size,
    };
  }

  get color(): string {
    return PowerUp.COLORS[this.type];
  }

  get icon(): string {
    return PowerUp.ICONS[this.type];
  }

  get label(): string {
    return PowerUp.LABELS[this.type];
  }

  /** 更新动画 */
  update(dt: number) {
    this.bounceOffset = Math.sin(Date.now() * GAME_CONFIG.POWERUP_BOUNCE_SPEED) * GAME_CONFIG.POWERUP_BOUNCE_HEIGHT;
    this.angle += dt * 0.003;
  }

  /** 绘制道具 */
  draw(ctx: CanvasRenderingContext2D) {
    if (this.collected) return;

    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2 + this.bounceOffset;
    const r = this.size / 2;

    ctx.save();

    // 发光外圈
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 6);
    glow.addColorStop(0, this.color + '80');
    glow.addColorStop(1, this.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fill();

    // 主体（菱形旋转）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // 菱形
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Emoji 图标
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icon, cx, cy);

    ctx.restore();
  }

  /** 随机生成一个道具类型 */
  static randomType(): PowerUpType {
    const types = Object.values(PowerUpType);
    return types[Math.floor(Math.random() * types.length)];
  }
}
