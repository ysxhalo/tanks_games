'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GAME_CONFIG } from './game/types';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 创建游戏引擎
    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    // 键盘事件监听
    const handleKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e);
    const handleKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 启动游戏
    engine.start();
    setLoading(false);

    // 清理
    return () => {
      engine.stop();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f1a]">
      {/* 游戏标题 */}
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
          🎮 坦克大战
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          方向键/WASD 移动 · 空格键 射击 · Enter 重新开始
        </p>
      </div>

      {/* 游戏画布容器 */}
      <div className="relative border-2 border-gray-700 rounded-lg overflow-hidden shadow-2xl shadow-blue-500/20">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
            <p className="text-white text-lg">加载中...</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.CANVAS_WIDTH}
          height={GAME_CONFIG.CANVAS_HEIGHT}
          className="block"
        />
      </div>

      {/* 操作提示 */}
      <div className="mt-6 flex gap-8 text-gray-500 text-sm">
        <div className="flex flex-col items-center">
          <span className="text-lg mb-1">⌨️</span>
          <span>移动</span>
          <span className="text-xs text-gray-600">WASD / 方向键</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg mb-1">💥</span>
          <span>射击</span>
          <span className="text-xs text-gray-600">空格键</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg mb-1">🔄</span>
          <span>重新开始</span>
          <span className="text-xs text-gray-600">Enter</span>
        </div>
      </div>
    </main>
  );
}
