'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className={`primary-header ${scrolled ? 'scrolled' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#0B0E14',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        boxShadow: scrolled ? '0 8px 30px rgba(0, 0, 0, 0.6)' : 'none',
      }}
    >
      <nav
        aria-label="Primary Navigation"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Top-Left Corner: Clickable Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link
            href="/"
            aria-label="MindForge AI Logo"
            className="navbar-logo-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              outline: 'none',
              borderRadius: 6,
              transition: 'transform 0.2s ease, opacity 0.2s ease',
            }}
          >
            <img
              src="/mindforge-logo.png"
              srcSet="/mindforge-logo.png 1x, /mindforge-logo@2x.png 2x"
              alt="MindForge AI Logo"
              width={118}
              height={38}
              style={{
                height: 38,
                width: 'auto',
                aspectRatio: '118 / 38',
                objectFit: 'contain',
                display: 'block',
                borderRadius: 4,
              }}
              className="navbar-brand-image"
            />
          </Link>
        </div>

        {/* Right Side: Navigation Menu Links & Actions (Desktop) */}
        <div className="navbar-right-group" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Navigation Menu Links */}
          <ul
            className="navbar-nav-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            <li>
              <Link
                href="/"
                className="nav-menu-link active"
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  padding: '6px 2px',
                }}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="#solutions"
                className="nav-menu-link"
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  padding: '6px 2px',
                }}
              >
                Solutions
              </Link>
            </li>
            <li>
              <Link
                href="#company"
                className="nav-menu-link"
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  padding: '6px 2px',
                }}
              >
                Company
              </Link>
            </li>
          </ul>

          {/* Action Buttons */}
          <div className="navbar-auth-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {session ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-sm"
                id="go-to-dashboard-btn"
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn btn-ghost btn-sm"
                  id="login-nav-btn"
                  style={{ height: 36, display: 'inline-flex', alignItems: 'center' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary btn-sm"
                  id="register-nav-btn"
                  style={{
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
                  }}
                >
                  ⚡ Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="navbar-mobile-toggle"
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            padding: '8px 10px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className="navbar-mobile-drawer"
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0B0E14',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 24px 24px',
            gap: 16,
            animation: 'fade-in 0.2s ease-out',
          }}
        >
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <li>
              <Link
                href="/"
                onClick={closeMobileMenu}
                style={{
                  display: 'block',
                  padding: '8px 0',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                }}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="#solutions"
                onClick={closeMobileMenu}
                style={{
                  display: 'block',
                  padding: '8px 0',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '1rem',
                  textDecoration: 'none',
                }}
              >
                Solutions
              </Link>
            </li>
            <li>
              <Link
                href="#company"
                onClick={closeMobileMenu}
                style={{
                  display: 'block',
                  padding: '8px 0',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '1rem',
                  textDecoration: 'none',
                }}
              >
                Company
              </Link>
            </li>
          </ul>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {session ? (
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center' }}
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="btn btn-ghost w-full"
                  style={{ justifyContent: 'center' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                >
                  ⚡ Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
