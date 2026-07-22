import { Direction, Position, GAME_CONFIG } from './types';

export class Bullet {
  x: number;
  y: number;
  size: number = GAME_CONFIG.BULLET_SIZE;
  direction: Direction;
  speed: number = GAME_CONFIG.BULLET_SPEED;
  active: boolean = true;
  isPlayerBullet: boolean;

  constructor(x: number, y: number, direction: Direction, isPlayerBullet: boolean) {
    this.x = x - this.size / 2;
    this.y = y - this.size / 2;
    this.direction = direction;
    this.isPlayerBullet = isPlayerBullet;
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
      y: this.y,
      width: this.size,
      height: this.size,
    };
  }

  /** 更新位置 */
  update() {
    switch (this.direction) {
      case Direction.UP:    this.y -= this.speed; break;
      case Direction.DOWN:  this.y += this.speed; break;
      case Direction.LEFT:  this.x -= this.speed; break;
      case Direction.RIGHT: this.x += this.speed; break;
    }

    // 超出边界则失活
    if (
      this.x < -this.size ||
      this.x > GAME_CONFIG.CANVAS_WIDTH ||
      this.y < -this.size ||
      this.y > GAME_CONFIG.CANVAS_HEIGHT
    ) {
      this.active = false;
    }
  }

  /** 绘制子弹 */
  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;

    ctx.save();

    // 发光效果
    const gradient = ctx.createRadialGradient(
      this.x + this.size / 2,
      this.y + this.size / 2,
      1,
      this.x + this.size / 2,
      this.y + this.size / 2,
      this.size
    );

    if (this.isPlayerBullet) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#ffdd44');
      gradient.addColorStop(1, '#ff8800');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#ff6666');
      gradient.addColorStop(1, '#ff0000');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
