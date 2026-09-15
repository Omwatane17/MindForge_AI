'use client';
import { useState } from 'react';
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
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} id="menu-toggle-btn">
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚡</span>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>MindForge</span>
          </div>
          <div style={{ width: 32 }} />
        </header>
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
