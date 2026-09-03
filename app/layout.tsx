import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'BEIO Lab · 周报', description: '建成环境智慧运维实验室周报与导师反馈平台' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
