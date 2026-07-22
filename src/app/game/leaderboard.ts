import { LeaderboardEntry, GAME_CONFIG } from './types';

/**
 * 排行榜管理器
 * 使用 localStorage 持久化存储前 N 名分数
 */
export class Leaderboard {
  private scores: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  /** 从 localStorage 加载数据 */
  private load() {
    try {
      const data = localStorage.getItem(GAME_CONFIG.STORAGE_KEY);
      if (data) {
        this.scores = JSON.parse(data) as LeaderboardEntry[];
      }
    } catch {
      this.scores = [];
    }
  }

  /** 保存到 localStorage */
  private save() {
    try {
      localStorage.setItem(GAME_CONFIG.STORAGE_KEY, JSON.stringify(this.scores));
    } catch {
      // 存储失败时静默处理
    }
  }

  /** 获取所有分数（按分数降序） */
  getScores(): LeaderboardEntry[] {
    return [...this.scores].sort((a, b) => b.score - a.score);
  }

  /** 获取前 N 名 */
  getTopScores(n: number = GAME_CONFIG.LEADERBOARD_MAX): LeaderboardEntry[] {
    return this.getScores().slice(0, n);
  }

  /** 添加新分数，返回排名（1-based） */
  addScore(name: string, score: number, level: number): number {
    const entry: LeaderboardEntry = {
      name: name.slice(0, 8), // 限制名字长度
      score,
      level,
      date: new Date().toISOString().split('T')[0],
    };

    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);

    // 只保留前 N 名
    if (this.scores.length > GAME_CONFIG.LEADERBOARD_MAX) {
      this.scores = this.scores.slice(0, GAME_CONFIG.LEADERBOARD_MAX);
    }

    this.save();

    // 返回排名
    const rank = this.scores.findIndex(s => s === entry) + 1;
    return rank;
  }

  /** 检查当前分数是否能进入排行榜 */
  isHighScore(score: number): boolean {
    if (this.scores.length < GAME_CONFIG.LEADERBOARD_MAX) return true;
    return score > this.scores[this.scores.length - 1].score;
  }

  /** 清除排行榜 */
  reset() {
    this.scores = [];
    this.save();
  }
}
