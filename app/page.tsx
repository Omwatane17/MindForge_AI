'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'rgba(8, 12, 24, 0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--brand-blue), var(--brand-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>⚡</div>
          <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.5px' }}>MindForge AI</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {session ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm" id="go-to-dashboard-btn">
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm" id="login-nav-btn">Sign In</Link>
              <Link href="/register" className="btn btn-primary btn-sm" id="register-nav-btn">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" style={{ paddingTop: 100 }}>
        <div className="hero-badge">
          ⚡ AI Deadline Survival Engine
        </div>
        <h1 className="hero-title">
          Stop Managing Tasks.<br />
          <span className="accent">Start Surviving Deadlines.</span>
        </h1>
        <p className="hero-subtitle">
          MindForge AI doesn't remind you. It tells you exactly what to do, what to skip, 
          and how to finish before time runs out.
        </p>
        <div className="hero-cta">
          {session ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg" id="hero-dashboard-btn">
              ⚡ Open Dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary btn-lg" id="hero-get-started-btn">
                ⚡ Get Started Free
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg" id="hero-signin-btn">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Demo rescue card */}
        <div style={{ maxWidth: 640, width: '100%', animation: 'fade-in 0.6s ease 0.3s both' }}>
          <div className="rescue-banner" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '1.5rem' }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 2 }}>
                DEADLINE FAILURE DETECTED
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                You have 6h available · Required: 10h · Original plan will fail
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>34%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SURVIVAL</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>✅ DO NOW</div>
              {['Core API implementation', 'Database schema', 'Auth flow', 'Core UI screens'].map(t => (
                <div key={t} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: 'var(--success)', fontSize: '0.7rem' }}>●</span> {t}
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>⏭️ SKIP</div>
              {['UI polish & animations', 'Nice-to-have features', 'Extra documentation'].map(t => (
                <div key={t} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center', textDecoration: 'line-through' }}>
                  <span style={{ fontSize: '0.7rem' }}>●</span> {t}
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--success-dim)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--success)' }}>
                ⏱️ Time saved: 3.5h → Survival: 82%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2>The AI Decision Loop</h2>
          <p style={{ marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
            MindForge answers 5 questions every second to keep you on track.
          </p>
        </div>
        <div className="grid-3" style={{ gap: 24 }}>
          {[
            { q: 'Can I finish?', desc: 'Calculates your Deadline Survival Score based on remaining work vs available time.', icon: '📊', color: 'var(--brand-blue)' },
            { q: 'What\'s blocking me?', desc: 'Identifies task dependencies and surface what\'s preventing forward progress.', icon: '🔗', color: 'var(--brand-purple)' },
            { q: 'What MUST I do?', desc: 'Ranks tasks by criticality and dependency chain to find the essential path.', icon: '🎯', color: 'var(--warning)' },
            { q: 'What should I SKIP?', desc: 'Identifies non-critical work that can be cut without affecting deadline outcome.', icon: '⏭️', color: 'var(--text-muted)' },
            { q: 'How do I recover?', desc: 'Generates a new survival plan when the original schedule is no longer possible.', icon: '🚨', color: 'var(--danger)' },
            { q: 'What\'s next?', desc: 'Always shows you the single most important task to work on right now.', icon: '⚡', color: 'var(--success)' },
          ].map((item) => (
            <div key={item.q} className="card" style={{ background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ fontSize: '1rem', color: item.color, marginBottom: 8 }}>{item.q}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section style={{ padding: '80px 32px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ marginBottom: 16, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
          Your deadline is counting down right now.
        </h2>
        <p style={{ marginBottom: 32, color: 'var(--text-secondary)' }}>
          Every minute you spend planning without AI is a minute closer to failure.
        </p>
        {!session && (
          <Link href="/register" className="btn btn-primary btn-lg" id="footer-cta-btn">
            ⚡ Start Surviving Deadlines
          </Link>
        )}
      </section>
    </div>
  );
}
