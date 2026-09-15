'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(res.error === 'CredentialsSignin' ? 'Invalid email or password' : res.error);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(59,130,246,0.1) 0%, transparent 60%), var(--bg-primary)'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--brand-blue), var(--brand-purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>⚡</div>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>MindForge AI</span>
            </div>
          </Link>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sign in to your survival engine</p>
        </div>

        <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email</label>
              <input
                id="email-input"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password-input">Password</label>
              <input
                id="password-input"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-danger" id="login-error">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
              style={{ justifyContent: 'center', marginTop: 4 }}
              disabled={loading}
            >
              {!loading && '⚡ Sign In'}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
