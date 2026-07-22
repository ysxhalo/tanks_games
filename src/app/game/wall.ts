import { WallType, GAME_CONFIG } from './types';

export class Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  type: WallType;
  destroyed: boolean = false;

  constructor(x: number, y: number, type: WallType) {
    this.x = x;
    this.y = y;
    this.width = GAME_CONFIG.TILE_SIZE;
    this.height = GAME_CONFIG.TILE_SIZE;
    this.type = type;
  }

  get rect() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /** 绘制墙体 */
  draw(ctx: CanvasRenderingContext2D) {
    if (this.destroyed) return;

    ctx.save();

    switch (this.type) {
      case WallType.BRICK:
        // 砖墙
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // 砖纹
        ctx.strokeStyle = '#922b21';
        ctx.lineWidth = 1;
        // 水平线
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.stroke();
        // 垂直线（交错）
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.moveTo(this.x + this.width / 4, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 4, this.y + this.height);
        ctx.moveTo(this.x + this.width * 3 / 4, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width * 3 / 4, this.y + this.height);
        ctx.stroke();
        break;

      case WallType.STEEL:
        // 钢墙
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        // 铆钉
        ctx.fillStyle = '#bdc3c7';
        const rivets = [
          [4, 4], [this.width - 4, 4],
          [4, this.height - 4], [this.width - 4, this.height - 4],
        ];
        rivets.forEach(([rx, ry]) => {
          ctx.beginPath();
          ctx.arc(this.x + rx, this.y + ry, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        break;

      case WallType.WATER:
        // 水域
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // 波浪效果
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const wy = this.y + 8 + i * 12;
          for (let wx = this.x; wx <= this.x + this.width; wx += 4) {
            const waveY = wy + Math.sin((wx + Date.now() * 0.003) * 0.3) * 3;
            wx === this.x ? ctx.moveTo(wx, waveY) : ctx.lineTo(wx, waveY);
          }
          ctx.stroke();
        }
        break;

      case WallType.BASE:
        // 基地（鹰旗）
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#e67e22';
        // 画一个简单的鹰
        ctx.beginPath();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', cx, cy);
        break;
    }

    ctx.restore();
  }
}
