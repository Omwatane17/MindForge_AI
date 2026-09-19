import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'MindForge AI — Deadline Survival Engine',
  description: 'MindForge AI is not a todo app. It\'s an AI deadline survival engine that continuously optimizes your work to maximize the chance of finishing before the deadline.',
  keywords: ['deadline', 'productivity', 'AI', 'task management', 'survival mode', 'time management'],
  authors: [{ name: 'MindForge AI' }],
  openGraph: {
    title: 'MindForge AI — Deadline Survival Engine',
    description: 'Can I finish? What\'s blocking me? What must I do? What should I skip? MindForge answers these questions with AI.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#080C18" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
