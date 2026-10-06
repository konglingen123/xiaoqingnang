import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/src/components/ToastProvider'

export const metadata: Metadata = {
  title: '小青囊',
  description: '让中式日常养护资料更容易搜索、阅读和理解。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><ToastProvider>{children}</ToastProvider></body></html>
}
