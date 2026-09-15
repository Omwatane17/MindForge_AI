'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { formatDuration, getPriorityColor, getPriorityLabel } from '@/lib/utils';

function TasksPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectDetail, setProjectDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    if (!selectedProject) return;
    fetch(`/api/projects/${selectedProject.id}`).then(r => r.json()).then(setProjectDetail).catch(() => {});
  }, [selectedProject]);

  const updateTask = async (taskId: string, taskStatus: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: taskStatus }),
    });
    if (selectedProject) {
      const res = await fetch(`/api/projects/${selectedProject.id}`);
      if (res.ok) setProjectDetail(await res.json());
    }
  };

  const tasks = projectDetail?.tasks || [];
  const dependencies = projectDetail?.dependencies || [];
  const depsMap: Record<string, string[]> = {};
  for (const dep of dependencies) {
    if (!depsMap[dep.task_id]) depsMap[dep.task_id] = [];
    depsMap[dep.task_id].push(dep.depends_on_task_id);
  }
  
  const filteredTasks = tasks.filter((t: any) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return t.is_critical;
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'in_progress') return t.status === 'in_progress';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'skippable') return t.can_skip;
    return true;
  });

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">✅ Tasks</h1>
          <p className="page-subtitle">All tasks with dependencies, priorities, and status</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-description">Create a project from the dashboard first.</div>
            <a href="/dashboard" className="btn btn-primary mt-16">Go to Dashboard</a>
          </div>
        ) : (
          <>
            {/* Project selector */}
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

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['all', 'critical', 'pending', 'in_progress', 'completed', 'skippable'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  id={`filter-${f}-btn`}>
                  {f === 'all' ? '🔘 All' : f === 'critical' ? '🔴 Critical' : f === 'pending' ? '⏳ Pending' : f === 'in_progress' ? '▶️ In Progress' : f === 'completed' ? '✅ Completed' : '⏭️ Skippable'}
                  <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 6px', fontSize: '0.7rem' }}>
                    {tasks.filter((t: any) => {
                      if (f === 'all') return true;
                      if (f === 'critical') return t.is_critical;
                      if (f === 'skippable') return t.can_skip;
                      return t.status === f;
                    }).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 200 }}>
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No tasks match this filter</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredTasks.map((task: any, idx: number) => {
                  const deps = depsMap[task.id] || [];
                  const depTitles = deps.map((depId: string) => tasks.find((t: any) => t.id === depId)?.title).filter(Boolean);

                  return (
                    <div key={task.id} id={`task-detail-${task.id}`}
                      className={`task-card ${task.is_critical ? 'critical' : ''} ${task.status}`}
                      style={{ opacity: task.status === 'skipped' ? 0.5 : 1 }}>
                      <div className="task-card-header">
                        <button
                          className={`task-card-status ${task.status === 'completed' ? 'checked' : ''}`}
                          onClick={() => updateTask(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', border: 'none', cursor: 'pointer' }}
                        >
                          {task.status === 'completed' ? '✓' : ''}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div className="task-card-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : undefined }}>
                            <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: '0.8rem' }}>#{idx + 1}</span>
                            {task.title}
                          </div>
                          {task.description && (
                            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>{task.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span style={{ color: getPriorityColor(task.priority_score), fontSize: '0.8rem', fontWeight: 700 }}>
                            {task.priority_score}/100
                          </span>
                          <span className={`badge badge-${getPriorityLabel(task.priority_score).toLowerCase()}`}>
                            {getPriorityLabel(task.priority_score)}
                          </span>
                        </div>
                      </div>

                      <div className="task-card-meta">
                        <span>⏱️ Est: {formatDuration(task.estimated_minutes)}</span>
                        {task.actual_minutes > 0 && <span>🕐 Actual: {formatDuration(task.actual_minutes)}</span>}
                        {task.is_critical && <span className="badge badge-critical">Critical Path</span>}
                        {task.can_skip && <span className="badge badge-low">Skippable</span>}
                        <span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'blue' : task.status === 'skipped' ? 'low' : 'medium'}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      {task.why_priority && (
                        <div className="why-task-box" style={{ marginTop: 10 }}>
                          <div className="why-task-label">💡 Why this priority?</div>
                          <div className="why-task-text">{task.why_priority}</div>
                        </div>
                      )}

                      {depTitles.length > 0 && (
                        <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          🔗 Depends on: {depTitles.join(' → ')}
                        </div>
                      )}

                      {task.status !== 'completed' && task.status !== 'skipped' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          {task.status !== 'in_progress' && (
                            <button className="btn btn-primary btn-sm" onClick={() => updateTask(task.id, 'in_progress')} id={`start-${task.id}-btn`}>
                              ▶️ Start
                            </button>
                          )}
                          <button className="btn btn-success btn-sm" onClick={() => updateTask(task.id, 'completed')} id={`done-${task.id}-btn`}>
                            ✅ Done
                          </button>
                          {task.can_skip && (
                            <button className="btn btn-ghost btn-sm" onClick={() => updateTask(task.id, 'skipped')} id={`skip-${task.id}-btn`}>
                              ⏭️ Skip
                            </button>
                          )}
                        </div>
                      )}
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

export default function TasksPage() {
  return <Suspense fallback={<div>Loading...</div>}><TasksPageContent /></Suspense>;
}
