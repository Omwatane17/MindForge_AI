'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { href: '/tasks', icon: '✅', label: 'Tasks' },
  { href: '/mindmap', icon: '🗺️', label: 'Mind Map' },
  { href: '/action-plan', icon: '📅', label: 'Action Plan' },
  { href: '/progress', icon: '📊', label: 'Progress & Risk' },
  { href: '/rescue', icon: '🚨', label: 'Rescue Mode' },
  { href: '/calendar', icon: '🗓️', label: 'Calendar' },
  { href: '/history', icon: '📜', label: 'History' },
  { href: '/profile', icon: '👤', label: 'Profile' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 299, backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <div className="sidebar-logo-text">MindForge</div>
            <div className="sidebar-logo-tagline">Deadline Survival Engine</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
              {item.href === '/rescue' && (
                <span className="badge badge-high" style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: '0.6rem' }}>HOT</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {session?.user && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Signed in as</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.name || session.user.email}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn btn-ghost w-full"
            style={{ justifyContent: 'center' }}
            id="sign-out-btn"
          >
            {signingOut ? '⏳ Signing out...' : '🚪 Sign Out'}
          </button>
        </div>
      </aside>
    </>
  );
}
