'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/history').then(r => r.json()).then(data => {
      setHistory(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status]);

  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    setHistory(h => h.filter(p => p.id !== projectId));
  };

  const getCompletionColor = (pct: number) => {
    if (pct >= 80) return 'var(--success)';
    if (pct >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">📜 History</h1>
          <p className="page-subtitle">All your past and current projects with completion data</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <div className="empty-state-title">No project history yet</div>
            <div className="empty-state-description">
              Projects you create will appear here with their completion data and patterns.
            </div>
            <a href="/dashboard" className="btn btn-primary mt-16">Create Your First Project</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {history.map((project: any) => {
              const completionPct = project.total_tasks > 0
                ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0;
              const daysAgo = Math.round((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24));
              const deadlinePassed = new Date(project.deadline) < new Date();

              return (
                <div key={project.id} id={`history-${project.id}`} className="card" style={{
                  borderLeft: `3px solid ${project.status === 'completed' ? 'var(--success)' : deadlinePassed ? 'var(--danger)' : 'var(--brand-blue)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{project.title}</h3>
                        <span className={`badge badge-${project.status === 'completed' ? 'success' : deadlinePassed ? 'high' : 'blue'}`}>
                          {project.status === 'completed' ? 'Completed' : deadlinePassed ? 'Overdue' : 'Active'}
                        </span>
                        <span className={`badge badge-${project.risk_level === 'low' ? 'success' : project.risk_level === 'medium' ? 'medium' : 'critical'}`}>
                          {project.risk_level?.toUpperCase() || 'UNKNOWN'} RISK
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        Created {daysAgo === 0 ? 'today' : `${daysAgo}d ago`} · Deadline: {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Task completion</span>
                          <span style={{ fontWeight: 700, color: getCompletionColor(completionPct) }}>{completionPct}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${completionPct}%`, background: getCompletionColor(completionPct) }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>✅ {project.completed_tasks || 0}/{project.total_tasks || 0} tasks</span>
                        <span>⏭️ {project.skipped_tasks || 0} skipped</span>
                        <span>⏱️ {((project.total_estimated_minutes || 0) / 60).toFixed(1)}h estimated</span>
                        <span>🎯 Survival: {Math.round(project.survival_score || 0)}%</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <a href={`/dashboard?projectId=${project.id}`} className="btn btn-ghost btn-sm">
                        View
                      </a>
                      <button onClick={() => deleteProject(project.id)} className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }} id={`delete-project-${project.id}-btn`}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
