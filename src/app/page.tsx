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
          方向键/WASD 移动 · 空格 射击 · P 暂停 · M 音效
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
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-gray-500 text-xs">
        <div className="flex flex-col items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-lg mb-1">⌨️</span>
          <span>移动</span>
          <span className="text-gray-600">WASD / 方向键</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-lg mb-1">💥</span>
          <span>射击</span>
          <span className="text-gray-600">空格键</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-lg mb-1">🔇</span>
          <span>音效开关</span>
          <span className="text-gray-600">M 键</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-lg mb-1">⏸️</span>
          <span>暂停</span>
          <span className="text-gray-600">P / Escape</span>
        </div>
      </div>

      {/* 关卡说明 */}
      <div className="mt-3 text-gray-600 text-xs text-center leading-relaxed">
        <p>共 4 关 · 每关难度递增 · 击败敌人掉落道具</p>
        <p className="mt-1">
          <span className="text-blue-400">⚡加速</span>
          <span className="mx-2">·</span>
          <span className="text-yellow-400">🛡️无敌</span>
          <span className="mx-2">·</span>
          <span className="text-red-400">💥散弹</span>
          <span className="mx-2">·</span>
          <span className="text-green-400">❤️加命</span>
        </p>
        <p className="mt-1">
          <span className="text-red-400">★</span> 激进型
          <span className="mx-2">·</span>
          <span className="text-orange-400">●</span> 防御型
          <span className="mx-2">·</span>
          <span className="text-purple-400">◆</span> 狙击型
        </p>
      </div>
    </main>
  );
}
