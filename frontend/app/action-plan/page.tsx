'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { formatDuration, formatDate } from '@/lib/utils';

function ActionPlanContent() {
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

  const plan = projectDetail?.actionPlan || [];
  const tasks = projectDetail?.tasks || [];
  
  // Group plan by day
  const planByDay: Record<number, any[]> = {};
  for (const item of plan) {
    const day = item.day_number;
    if (!planByDay[day]) planByDay[day] = [];
    planByDay[day].push(item);
  }
  const days = Object.keys(planByDay).map(Number).sort((a, b) => a - b);

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">📅 Action Plan</h1>
          <p className="page-subtitle">Day-by-day breakdown of your work schedule</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
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

            {days.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No action plan generated yet</div>
                <div className="empty-state-description">The action plan is generated when you create a project.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {days.map((dayNum) => {
                  const dayItems = planByDay[dayNum];
                  const date = dayItems[0]?.planned_date;
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const isPast = date && new Date(date) < new Date() && !isToday;
                  const totalHours = dayItems.reduce((sum: number, i: any) => sum + (i.planned_hours || 0), 0);
                  const completedItems = dayItems.filter((i: any) => i.status === 'completed' || i.status === 'skipped');

                  return (
                    <div key={dayNum} id={`day-${dayNum}`} style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : isPast ? 'rgba(107,114,128,0.2)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: 20,
                      opacity: isPast && !isToday ? 0.7 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                          background: isToday ? 'var(--brand-blue)' : isPast ? 'var(--text-muted)' : 'var(--bg-secondary)',
                          color: isToday ? 'white' : 'var(--text-secondary)',
                          borderRadius: 8, padding: '6px 12px', fontWeight: 800, fontSize: '0.875rem',
                          border: '1px solid var(--border)'
                        }}>
                          Day {dayNum}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {date ? formatDate(date) : `Day ${dayNum}`}
                            {isToday && <span className="badge badge-blue" style={{ marginLeft: 8 }}>TODAY</span>}
                            {isPast && <span className="badge badge-low" style={{ marginLeft: 8 }}>PAST</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {totalHours.toFixed(1)}h planned · {completedItems.length}/{dayItems.length} done
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <div className="progress-bar" style={{ width: 100, height: 4 }}>
                            <div className="progress-fill success"
                              style={{ width: `${dayItems.length > 0 ? (completedItems.length / dayItems.length) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {dayItems.map((item: any) => {
                          const task = tasks.find((t: any) => t.id === item.task_id);
                          if (!task) return null;
                          return (
                            <div key={item.id} style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                              background: 'var(--bg-secondary)', borderRadius: 8,
                              opacity: item.status === 'completed' || item.status === 'skipped' ? 0.6 : 1,
                            }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                background: item.status === 'completed' ? 'var(--success)' : item.status === 'in_progress' ? 'var(--warning)' : item.status === 'skipped' ? 'var(--text-muted)' : 'var(--brand-blue)',
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', textDecoration: item.status === 'skipped' ? 'line-through' : item.status === 'completed' ? 'line-through' : undefined }}>
                                  {task.title}
                                </div>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                {formatDuration(task.estimated_minutes)}
                              </span>
                              <span className={`badge badge-${item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'blue' : 'low'}`} style={{ flexShrink: 0 }}>
                                {item.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function ActionPlanPage() {
  return <Suspense fallback={<div>Loading...</div>}><ActionPlanContent /></Suspense>;
}
