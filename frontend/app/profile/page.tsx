'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/users').then(r => r.json()).then(data => {
      setProfile(data);
      setName(data.name || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status]);

  const saveProfile = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setProfile((p: any) => ({ ...p, name }));
        setEditing(false);
        setMessage('Profile updated!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch { setError('Failed to save'); }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="loading-spinner" style={{ width: 40, height: 40 }} />
        </div>
      </AppLayout>
    );
  }

  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const stats = profile?.stats || {};
  const completionRate = stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;

  return (
    <AppLayout>
      <div className="page" style={{ maxWidth: 700 }}>
        <div className="page-header">
          <h1 className="page-title">👤 Profile</h1>
          <p className="page-subtitle">Your account information and productivity statistics</p>
        </div>

        {/* Profile card */}
        <div className="card mb-24">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--brand-blue), var(--brand-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', fontWeight: 900, color: 'white',
            }}>
              {profile?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 4 }}>{profile?.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{profile?.email}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>Member since {joinDate}</div>
            </div>
            <button
              id="edit-profile-btn"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Cancel' : '✏️ Edit'}
            </button>
          </div>

          {editing && (
            <div className="animate-fade-in" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="profile-name-input">Display Name</label>
                <input
                  id="profile-name-input"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </div>
              {error && <div className="alert alert-danger mb-12" style={{ fontSize: '0.825rem' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  id="save-profile-btn"
                  className={`btn btn-primary btn-sm ${saving ? 'btn-loading' : ''}`}
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {!saving && '💾 Save Changes'}
                </button>
              </div>
            </div>
          )}

          {message && <div className="alert alert-success mt-12" style={{ fontSize: '0.825rem' }}>✅ {message}</div>}
        </div>

        {/* Stats */}
        <div className="card mb-24">
          <div className="card-title mb-16">📊 Your Statistics</div>
          <div className="grid-2" style={{ gap: 16 }}>
            {[
              { label: 'Total Projects', value: stats.total_projects || 0, icon: '🎯' },
              { label: 'Completed Projects', value: stats.completed_projects || 0, icon: '✅' },
              { label: 'Total Tasks Created', value: stats.total_tasks || 0, icon: '📋' },
              { label: 'Tasks Completed', value: stats.completed_tasks || 0, icon: '🏆' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
          {stats.total_tasks > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Overall Task Completion Rate</span>
                <span style={{ fontWeight: 700, color: completionRate >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                  {completionRate}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div
                  className={`progress-fill ${completionRate >= 70 ? 'success' : ''}`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delay pattern insight */}
        <div className="card mb-24" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.03))' }}>
          <div className="card-title mb-12">🧠 Personal Delay Pattern</div>
          {stats.total_projects < 3 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Complete at least 3 projects for MindForge to analyze your personal delay patterns and provide customized recommendations.
              <div style={{ marginTop: 8 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, ((stats.total_projects || 0) / 3) * 100)}%` }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {stats.total_projects || 0}/3 projects completed
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Based on your history: you tend to complete {completionRate}% of tasks. 
              {completionRate < 60 ? ' Focus on breaking tasks smaller to improve completion rates.' : ' Good completion rate! Keep applying Rescue Mode when needed.'}
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="card-title mb-8" style={{ color: 'var(--danger)' }}>⚠️ Account Actions</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Signing out will return you to the login page. Your data is preserved.
          </p>
          <button
            id="profile-signout-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
