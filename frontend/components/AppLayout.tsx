'use client';
import { useState } from 'react';
import Link from 'next/link';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} id="menu-toggle-btn" aria-label="Toggle Navigation Menu">
            ☰
          </button>
          <Link href="/" aria-label="MindForge AI Home" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src="/mindforge-logo.png"
              srcSet="/mindforge-logo.png 1x, /mindforge-logo@2x.png 2x"
              alt="MindForge AI Logo"
              width={118}
              height={38}
              style={{ height: 28, width: 'auto', aspectRatio: '118 / 38', objectFit: 'contain', display: 'block' }}
            />
          </Link>
          <div style={{ width: 32 }} />
        </header>
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
