'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import SurvivalGauge from '@/components/SurvivalGauge';
import DeadlineCountdown from '@/components/DeadlineCountdown';

function ProgressContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectDetail, setProjectDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const requestedId = searchParams?.get('projectId');
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(data);
      if (data.length > 0) {
        const found = requestedId ? data.find((p: any) => p.id === requestedId) : null;
        setSelectedProject(found || data[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, searchParams]);

  useEffect(() => {
    if (!selectedProject) return;
    fetch(`/api/projects/${selectedProject.id}`).then(r => r.json()).then(setProjectDetail).catch(() => {});
  }, [selectedProject]);

  const tasks = projectDetail?.tasks || [];
  const risk = projectDetail?.risk;
  const project = projectDetail?.project;

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    pending: tasks.filter((t: any) => t.status === 'pending').length,
    skipped: tasks.filter((t: any) => t.status === 'skipped').length,
    critical: tasks.filter((t: any) => t.is_critical).length,
    completedHours: tasks.filter((t: any) => t.status === 'completed').reduce((s: number, t: any) => s + t.estimated_minutes / 60, 0),
    remainingHours: tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'skipped').reduce((s: number, t: any) => s + t.estimated_minutes / 60, 0),
    totalHours: tasks.reduce((s: number, t: any) => s + t.estimated_minutes / 60, 0),
  };

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">📊 Progress & Risk</h1>
          <p className="page-subtitle">Real-time tracking of your deadline survival probability</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No projects yet</div>
            <Link href="/dashboard" className="btn btn-primary mt-16">Create a Project</Link>
          </div>
        ) : (
          <>
            {projects.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {projects.map((p: any) => (
                  <button key={p.id} onClick={() => setSelectedProject(p)}
                    className={`btn btn-sm ${selectedProject?.id === p.id ? 'btn-primary' : 'btn-ghost'}`}>
                    {p.title.slice(0, 25)}
                  </button>
                ))}
              </div>
            )}

            {project && (
              <>
                {/* Survival + countdown */}
                <div className="grid-2 mb-24">
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <SurvivalGauge score={project.survival_score ?? 100} size={140} />
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Deadline Survival Score</h2>
                      <p style={{ fontSize: '0.875rem', marginBottom: 12 }}>
                        {risk?.riskLevel === 'low' ? 'You are on track to meet the deadline.' :
                          risk?.riskLevel === 'medium' ? 'Moderate risk. Increase your pace.' :
                          risk?.riskLevel === 'high' ? 'High risk of missing deadline.' :
                          'Critical: Activate Rescue Mode immediately.'}
                      </p>
                      <span className={`badge badge-${risk?.riskLevel === 'low' ? 'success' : risk?.riskLevel === 'medium' ? 'medium' : 'critical'}`} style={{ fontSize: '0.8rem' }}>
                        {risk?.riskLevel?.toUpperCase() || 'UNKNOWN'} RISK
                      </span>
                      {risk?.predictedDelayHours > 0 && (
                        <div className="alert alert-danger mt-12" style={{ fontSize: '0.8rem' }}>
                          ⚠️ Predicted delay: {risk.predictedDelayHours.toFixed(1)} hours
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card-title">⏰ Time Remaining</div>
                    <DeadlineCountdown deadline={selectedProject.deadline} />
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Deadline: {new Date(selectedProject.deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    {risk?.recommendation && (
                      <div className={`alert ${risk.riskLevel === 'low' ? 'alert-success' : risk.riskLevel === 'medium' ? 'alert-warning' : 'alert-danger'}`} style={{ fontSize: '0.825rem' }}>
                        {risk.recommendation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress stats */}
                <div className="grid-4 mb-24">
                  {[
                    { label: 'Completed', value: stats.completed, total: stats.total, color: 'var(--success)', icon: '✅' },
                    { label: 'In Progress', value: stats.inProgress, total: stats.total, color: 'var(--warning)', icon: '▶️' },
                    { label: 'Pending', value: stats.pending, total: stats.total, color: 'var(--brand-blue)', icon: '⏳' },
                    { label: 'Skipped', value: stats.skipped, total: stats.total, color: 'var(--text-muted)', icon: '⏭️' },
                  ].map((stat) => (
                    <div key={stat.label} className="stat-card">
                      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{stat.icon}</div>
                      <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="stat-label">{stat.label}</div>
                      <div className="progress-bar mt-8">
                        <div className="progress-fill" style={{ width: `${stat.total > 0 ? (stat.value / stat.total) * 100 : 0}%`, background: stat.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall progress bar */}
                <div className="card mb-24">
                  <div className="card-header">
                    <span className="card-title">Overall Progress</span>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', color: progressPct >= 75 ? 'var(--success)' : progressPct >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                      {progressPct}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 12 }}>
                    <div className={`progress-fill ${progressPct >= 75 ? 'success' : progressPct >= 40 ? '' : 'danger'}`}
                      style={{ width: `${progressPct}%`, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <span>{stats.completedHours.toFixed(1)}h completed</span>
                    <span>{stats.remainingHours.toFixed(1)}h remaining</span>
                    <span>{stats.totalHours.toFixed(1)}h total</span>
                  </div>
                </div>

                {/* Hours breakdown */}
                <div className="card">
                  <div className="card-title mb-16">Work Distribution</div>
                  {tasks.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>No tasks</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tasks.map((task: any) => (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 120, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {task.title}
                          </div>
                          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 4,
                              width: `${stats.totalHours > 0 ? (task.estimated_minutes / 60 / stats.totalHours) * 100 : 0}%`,
                              background: task.status === 'completed' ? 'var(--success)' : task.status === 'in_progress' ? 'var(--warning)' : task.status === 'skipped' ? 'var(--text-muted)' : 'var(--brand-blue)',
                              transition: 'width 0.6s ease'
                            }} />
                          </div>
                          <div style={{ width: 40, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                            {(task.estimated_minutes / 60).toFixed(1)}h
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function ProgressPage() {
  return <Suspense fallback={<div>Loading...</div>}><ProgressContent /></Suspense>;
}
