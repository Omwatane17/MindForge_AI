'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      // Auto sign-in
      const signInRes = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (signInRes?.error) {
        router.push('/login');
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
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }} aria-label="MindForge AI Home">
            <img
              src="/mindforge-logo.png"
              srcSet="/mindforge-logo.png 1x, /mindforge-logo@2x.png 2x"
              alt="MindForge AI Logo"
              width={124}
              height={40}
              style={{ height: 40, width: 'auto', aspectRatio: '118 / 38', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
            />
          </Link>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Start surviving your deadlines with AI</p>
        </div>

        <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name-input">Full Name</label>
              <input
                id="name-input"
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email-input">Email</label>
              <input
                id="reg-email-input"
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password-input">Password</label>
              <input
                id="reg-password-input"
                type="password"
                className="form-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password-input">Confirm Password</label>
              <input
                id="confirm-password-input"
                type="password"
                className="form-input"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-danger" id="register-error">⚠️ {error}</div>
            )}

            <button
              type="submit"
              id="register-submit-btn"
              className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
              style={{ justifyContent: 'center', marginTop: 4 }}
              disabled={loading}
            >
              {!loading && '⚡ Create Account'}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
