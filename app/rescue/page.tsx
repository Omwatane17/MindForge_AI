'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import SurvivalGauge from '@/components/SurvivalGauge';
import { formatDuration, getPriorityColor } from '@/lib/utils';

function RescuePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectDetail, setProjectDetail] = useState<any>(null);
  const [rescueResult, setRescueResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [availableHours, setAvailableHours] = useState<number>(6);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data.length > 0) setSelectedProject(data[0]);
        }
      } catch { }
      setLoading(false);
    };
    load();
  }, [status]);

  useEffect(() => {
    if (!selectedProject) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${selectedProject.id}`);
        if (res.ok) setProjectDetail(await res.json());
      } catch { }
    };
    load();
  }, [selectedProject]);

  const activateRescue = async () => {
    if (!selectedProject) return;
    setActivating(true);
    setError('');
    try {
      const res = await fetch('/api/rescue-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id, availableHours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRescueResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to activate rescue mode');
    } finally {
      setActivating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="loading-spinner" style={{ width: 40, height: 40 }} />
        </div>
      </AppLayout>
    );
  }

  const tasks = projectDetail?.tasks || [];
  const requiredHours = tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress')
    .reduce((sum: number, t: any) => sum + t.estimated_minutes / 60, 0);

  return (
    <AppLayout>
      <div className="rescue-mode-page">
        {/* Rescue Header */}
        <div className="rescue-header">
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <span style={{ fontSize: '2rem' }}>🚨</span>
              <div>
                <h1 style={{ color: 'var(--danger)', fontSize: '1.75rem', marginBottom: 4 }}>
                  LAST-MINUTE RESCUE MODE
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  MindForge will determine what MUST be done, what to SKIP, and create a new survival plan.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="page" style={{ paddingTop: 24 }}>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No active projects</div>
              <div className="empty-state-description">Go to the dashboard to create a project first.</div>
              <a href="/dashboard" className="btn btn-primary mt-16">Go to Dashboard</a>
            </div>
          ) : (
            <>
              {/* Project selector */}
              {projects.length > 1 && (
                <div className="card mb-24">
                  <div className="card-title mb-12">Select Project</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {projects.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(p); setRescueResult(null); }}
                        className={`btn btn-sm ${selectedProject?.id === p.id ? 'btn-danger' : 'btn-ghost'}`}
                        id={`rescue-project-${p.id}`}
                      >
                        {p.title.slice(0, 30)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Situation analysis */}
              {selectedProject && (
                <div className="grid-2 mb-24" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="card" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="card-title mb-16" style={{ color: 'var(--danger)' }}>⚠️ Situation Assessment</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Project</span>
                        <span style={{ fontWeight: 700 }}>{selectedProject.title}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Deadline</span>
                        <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                          {new Date(selectedProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Required work</span>
                        <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{requiredHours.toFixed(1)}h</span>
                      </div>
                      <hr className="divider" />
                      <div>
                        <label className="form-label" htmlFor="available-hours-input">
                          ⏰ Your available time (hours)
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                          <input
                            id="available-hours-input"
                            type="number"
                            className="form-input"
                            value={availableHours}
                            onChange={(e) => setAvailableHours(Math.max(0, parseFloat(e.target.value) || 0))}
                            min={0}
                            max={48}
                            step={0.5}
                            style={{ flex: 1 }}
                          />
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>hours</span>
                        </div>
                        {availableHours < requiredHours && (
                          <div className="alert alert-danger mt-8" style={{ fontSize: '0.78rem', padding: '8px 12px' }}>
                            ⚠️ You're {(requiredHours - availableHours).toFixed(1)}h short! Rescue Mode needed.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 240 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                        Current Survival Score
                      </div>
                      <SurvivalGauge score={selectedProject.survival_score ?? 50} size={140} />
                    </div>
                    {error && <div className="alert alert-danger w-full" style={{ fontSize: '0.8rem' }}>{error}</div>}
                    <button
                      id="activate-rescue-btn"
                      className={`btn btn-danger btn-lg w-full ${activating ? 'btn-loading' : ''}`}
                      onClick={activateRescue}
                      disabled={activating}
                      style={{ justifyContent: 'center' }}
                    >
                      {!activating && '🚨 ACTIVATE RESCUE MODE'}
                    </button>
                  </div>
                </div>
              )}

              {/* Rescue Result */}
              {rescueResult && (
                <div className="animate-fade-in">
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))',
                    border: '2px solid rgba(239,68,68,0.3)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 28, marginBottom: 24
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '2rem' }}>🤖</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '1.125rem', color: 'var(--danger)', marginBottom: 4 }}>
                          AI RESCUE DECISION
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {rescueResult.explanation}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid-4 mb-24">
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Available</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)' }}>
                          {rescueResult.availableHours?.toFixed(1)}h
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Required</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>
                          {rescueResult.requiredHours?.toFixed(1)}h
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Time Saved</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>
                          {rescueResult.timeSavedHours?.toFixed(1)}h
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>New Survival</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: rescueResult.newSurvivalScore >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                          {rescueResult.newSurvivalScore}%
                        </div>
                      </div>
                    </div>

                    {/* DO NOW / SKIP */}
                    <div className="grid-2" style={{ gap: 20 }}>
                      {/* Critical - DO NOW */}
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                          <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            ✅ DO NOW — {rescueResult.criticalTasks?.length || 0} Critical Tasks
                          </span>
                        </div>
                        {rescueResult.tasks?.filter((t: any) => t.isCritical).map((task: any) => (
                          <div key={task.id} style={{
                            background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '12px 14px',
                            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10
                          }}>
                            <span style={{ color: 'var(--success)', fontSize: '1rem' }}>●</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>{task.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ⏱️ {formatDuration(task.estimated_minutes)}
                                {task.is_critical ? <span className="badge badge-critical" style={{ marginLeft: 8, fontSize: '0.62rem' }}>CRITICAL PATH</span> : null}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!rescueResult.tasks?.some((t: any) => t.isCritical)) && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>All tasks marked for review</div>
                        )}
                      </div>

                      {/* SKIP LIST */}
                      <div style={{ background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.2)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            ⏭️ SKIP — {rescueResult.skipTasks?.length || 0} Tasks
                          </span>
                        </div>
                        {rescueResult.tasks?.filter((t: any) => t.shouldSkip).map((task: any) => (
                          <div key={task.id} style={{
                            background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '12px 14px',
                            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
                            opacity: 0.7
                          }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '1rem', textDecoration: 'line-through' }}>●</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2, textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                                {task.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ⏱️ {formatDuration(task.estimated_minutes)} saved
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!rescueResult.tasks?.some((t: any) => t.shouldSkip)) && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tasks identified to skip</div>
                        )}

                        {/* Summary */}
                        <div style={{
                          background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: 8, padding: '10px 14px', marginTop: 12
                        }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)', marginBottom: 2 }}>
                            Time Saved: {rescueResult.timeSavedHours?.toFixed(1)} hours
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            New completion: {rescueResult.newCompletionEstimate}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <a href="/tasks" className="btn btn-primary btn-lg" id="go-to-tasks-from-rescue">
                        ⚡ Start Working on Critical Tasks
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function RescuePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RescuePageContent />
    </Suspense>
  );
}
