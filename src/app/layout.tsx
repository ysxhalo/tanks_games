import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '坦克大战 - Tank Battle',
  description: '经典坦克大战游戏，使用Next.js构建',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
