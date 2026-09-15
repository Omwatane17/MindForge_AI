'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import SurvivalGauge from '@/components/SurvivalGauge';
import DeadlineCountdown from '@/components/DeadlineCountdown';
import VoiceTextInput from '@/components/VoiceTextInput';
import Link from 'next/link';
import { formatDuration, getPriorityColor, getPriorityLabel, daysUntil } from '@/lib/utils';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [projectDetail, setProjectDetail] = useState<any>(null);
  const [nextTask, setNextTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inputLoading, setInputLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [parsedGoal, setParsedGoal] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
        }
      }
    } catch { }
    setLoading(false);
  }, [activeProject]);

  useEffect(() => {
    if (status === 'authenticated') loadProjects();
  }, [status, loadProjects]);

  useEffect(() => {
    if (!activeProject) return;
    const loadDetail = async () => {
      try {
        const [detailRes, nextRes] = await Promise.all([
          fetch(`/api/projects/${activeProject.id}`),
          fetch(`/api/next-task?projectId=${activeProject.id}`),
        ]);
        if (detailRes.ok) setProjectDetail(await detailRes.json());
        if (nextRes.ok) setNextTask(await nextRes.json());
      } catch { }
    };
    loadDetail();
  }, [activeProject]);

  const handleVoiceInput = async (text: string) => {
    setInputLoading(true);
    setInputError('');
    try {
      const res = await fetch('/api/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParsedGoal(data);
      setShowNewProject(true);
    } catch (err: any) {
      setInputError(err.message || 'Failed to parse goal. Please try again.');
    } finally {
      setInputLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!parsedGoal) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedGoal),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowNewProject(false);
      setParsedGoal(null);
      await loadProjects();
      setActiveProject(data.project);
    } catch (err: any) {
      setInputError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleTaskAction = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Reload detail
      if (activeProject) {
        const [detailRes, nextRes] = await Promise.all([
          fetch(`/api/projects/${activeProject.id}`),
          fetch(`/api/next-task?projectId=${activeProject.id}`),
        ]);
        if (detailRes.ok) setProjectDetail(await detailRes.json());
        if (nextRes.ok) setNextTask(await nextRes.json());
        await loadProjects();
      }
    } catch { }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: 40, height: 40, marginBottom: 16 }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading your survival engine...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const risk = projectDetail?.risk;
  const tasks = projectDetail?.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');
  const progressPct = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const totalHours = tasks.reduce((sum: number, t: any) => sum + t.estimated_minutes / 60, 0);
  const remainingHours = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'skipped').reduce((sum: number, t: any) => sum + t.estimated_minutes / 60, 0);

  return (
    <AppLayout>
      <div className="page">
        {/* Header */}
        <div className="page-header flex items-center justify-between flex-wrap gap-16">
          <div>
            <h1 className="page-title">⚡ Mission Control</h1>
            <p className="page-subtitle">
              {session?.user?.name ? `Welcome back, ${session.user.name.split(' ')[0]}.` : 'Welcome back.'}{' '}
              {activeProject ? 'Here\'s your current situation.' : 'Start by adding your first goal.'}
            </p>
          </div>
          {activeProject && (
            <Link href="/rescue" className="btn btn-danger btn-sm" id="open-rescue-btn">
              🚨 Rescue Mode
            </Link>
          )}
        </div>

        {/* Input section */}
        <div className="card mb-24" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.03))' }}>
          <div className="card-header">
            <span className="card-title">🎯 New Goal or Deadline</span>
            {inputLoading && <div className="loading-spinner" style={{ width: 18, height: 18 }} />}
          </div>
          <VoiceTextInput onSubmit={handleVoiceInput} loading={inputLoading} />
          {inputError && <div className="alert alert-danger mt-8" id="input-error">⚠️ {inputError}</div>}
        </div>

        {/* Parsed goal confirmation modal */}
        {showNewProject && parsedGoal && (
          <div className="modal-overlay">
            <div className="modal animate-scale-in">
              <h3 style={{ marginBottom: 16 }}>🤖 AI Understood Your Goal</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>Goal</div>
                  <div style={{ fontWeight: 700 }}>{parsedGoal.goal}</div>
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Deadline</div>
                    <div style={{ fontWeight: 700, color: daysUntil(parsedGoal.deadline) < 3 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {new Date(parsedGoal.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                        {daysUntil(parsedGoal.deadline)} days from now
                      </span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Estimated Effort</div>
                    <div style={{ fontWeight: 700 }}>{parsedGoal.estimatedEffortHours}h</div>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>Priority</div>
                  <span className={`badge badge-${parsedGoal.priority === 'critical' ? 'critical' : parsedGoal.priority === 'high' ? 'high' : parsedGoal.priority === 'medium' ? 'medium' : 'low'}`}>
                    {parsedGoal.priority?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="alert alert-info mb-16" style={{ fontSize: '0.8rem' }}>
                ℹ️ MindForge will generate tasks, dependencies, time estimates, and an action plan automatically.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  id="create-project-btn"
                  className={`btn btn-primary flex-1 ${creating ? 'btn-loading' : ''}`}
                  onClick={handleCreateProject}
                  disabled={creating}
                  style={{ justifyContent: 'center' }}
                >
                  {!creating && '⚡ Create Project & Generate Plan'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowNewProject(false); setParsedGoal(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project selector */}
        {projects.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {projects.filter((p: any) => p.status === 'active').map((p: any) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p)}
                className={`btn btn-sm ${activeProject?.id === p.id ? 'btn-primary' : 'btn-ghost'}`}
                id={`project-tab-${p.id}`}
              >
                {p.title.slice(0, 30)}
              </button>
            ))}
          </div>
        )}

        {/* No projects */}
        {projects.length === 0 && !loading && (
          <div className="empty-state" style={{ minHeight: 300 }}>
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No goals yet</div>
            <div className="empty-state-description">
              Type your goal above and MindForge AI will create your survival plan automatically.
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Example: "I have a hackathon submission in 3 days"
            </div>
          </div>
        )}

        {/* Dashboard content */}
        {activeProject && projectDetail && (
          <>
            {/* Rescue mode alert */}
            {risk && risk.survivalScore < 50 && (
              <div className="rescue-banner mb-24">
                <span style={{ fontSize: '1.5rem' }}>🚨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.875rem' }}>
                    DEADLINE FAILURE DETECTED — RESCUE MODE AVAILABLE
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {risk.failureReason}
                  </div>
                </div>
                <Link href="/rescue" className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
                  Activate
                </Link>
              </div>
            )}

            {/* Top stats */}
            <div className="grid-4 mb-24">
              <div className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">Survival Score</div>
                    <div className="stat-value" style={{ color: risk ? (risk.survivalScore >= 75 ? 'var(--success)' : risk.survivalScore >= 50 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-primary)' }}>
                      {projectDetail.project?.survival_score ?? 100}%
                    </div>
                  </div>
                  <SurvivalGauge score={projectDetail.project?.survival_score ?? 100} size={64} showLabel={false} />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Deadline</div>
                <DeadlineCountdown deadline={activeProject.deadline} compact={true} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {new Date(activeProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Progress</div>
                <div className="stat-value">{progressPct}%</div>
                <div className="progress-bar mt-8">
                  <div
                    className={`progress-fill ${progressPct >= 75 ? 'success' : progressPct >= 40 ? '' : 'danger'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {completedTasks.length}/{tasks.length} tasks
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining Work</div>
                <div className="stat-value">{remainingHours.toFixed(1)}h</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  of {totalHours.toFixed(1)}h total
                </div>
                {risk && risk.predictedDelayHours > 0 && (
                  <div className="stat-change negative">+{risk.predictedDelayHours.toFixed(1)}h delay</div>
                )}
              </div>
            </div>

            {/* Main grid */}
            <div className="grid-2 mb-24" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
              {/* Next Task */}
              {nextTask?.nextTask ? (
                <div className="next-task-card">
                  <div className="next-task-label">⚡ Your Next Task</div>
                  <div className="next-task-title">{nextTask.nextTask.title}</div>
                  <div className="next-task-description">{nextTask.nextTask.description}</div>
                  <div className="next-task-meta">
                    <div className="next-task-meta-item">
                      <span>⏱️</span>
                      <span>{formatDuration(nextTask.nextTask.estimated_minutes)}</span>
                    </div>
                    <div className="next-task-meta-item">
                      <span style={{ color: getPriorityColor(nextTask.nextTask.priority_score) }}>●</span>
                      <span>{getPriorityLabel(nextTask.nextTask.priority_score)} Priority</span>
                    </div>
                    {nextTask.nextTask.is_critical ? (
                      <span className="badge badge-critical">Critical</span>
                    ) : null}
                  </div>
                  {nextTask.nextTask.why_priority && (
                    <div className="why-task-box">
                      <div className="why-task-label">💡 Why this task?</div>
                      <div className="why-task-text">{nextTask.nextTask.why_priority}</div>
                    </div>
                  )}
                  <div className="next-task-actions">
                    <button
                      id="start-task-btn"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTaskAction(nextTask.nextTask.id, 'in_progress')}
                    >
                      ▶️ Start Task
                    </button>
                    <button
                      id="complete-task-btn"
                      className="btn btn-success btn-sm"
                      onClick={() => handleTaskAction(nextTask.nextTask.id, 'completed')}
                    >
                      ✅ Mark Complete
                    </button>
                    <button
                      id="skip-task-btn"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleTaskAction(nextTask.nextTask.id, 'skipped')}
                    >
                      ⏭️ Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 200 }}>
                  <div style={{ fontSize: '2.5rem' }}>🎉</div>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>All tasks complete!</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Great job meeting your deadline.</div>
                </div>
              )}

              {/* Risk & AI recommendation */}
              {risk && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">📊 Risk Analysis</span>
                    <span className={`badge badge-${risk.riskLevel === 'low' ? 'success' : risk.riskLevel === 'medium' ? 'medium' : risk.riskLevel === 'high' ? 'high' : 'critical'}`}>
                      {risk.riskLevel?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div className="risk-meter">
                      <div className="risk-meter-bar">
                        <div
                          className="risk-meter-indicator"
                          style={{ left: `${100 - (projectDetail.project?.survival_score ?? 50)}%` }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>Safe</span>
                        <span>Critical</span>
                      </div>
                    </div>
                  </div>
                  {risk.recommendation && (
                    <div className={`alert ${risk.riskLevel === 'low' ? 'alert-success' : risk.riskLevel === 'medium' ? 'alert-warning' : 'alert-danger'}`} style={{ fontSize: '0.825rem' }}>
                      {risk.recommendation}
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quick Links</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={`/tasks?projectId=${activeProject.id}`} className="btn btn-ghost btn-sm">Tasks</Link>
                      <Link href={`/mindmap?projectId=${activeProject.id}`} className="btn btn-ghost btn-sm">Mind Map</Link>
                      <Link href={`/action-plan?projectId=${activeProject.id}`} className="btn btn-ghost btn-sm">Action Plan</Link>
                      <Link href={`/progress?projectId=${activeProject.id}`} className="btn btn-ghost btn-sm">Progress</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Task list preview */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 All Tasks</span>
                <Link href={`/tasks?projectId=${activeProject.id}`} className="btn btn-ghost btn-sm">
                  View All
                </Link>
              </div>
              {tasks.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-state-icon">📝</div>
                  <div>No tasks generated yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.slice(0, 5).map((task: any) => (
                    <div
                      key={task.id}
                      className={`task-card ${task.is_critical ? 'critical' : ''} ${task.status}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                      id={`task-item-${task.id}`}
                    >
                      <button
                        className={`task-card-status ${task.status === 'completed' ? 'checked' : ''}`}
                        onClick={() => handleTaskAction(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {task.status === 'completed' ? '✓' : ''}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div className="task-card-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : undefined, opacity: task.status === 'skipped' ? 0.5 : 1 }}>
                          {task.title}
                        </div>
                        <div className="task-card-meta">
                          <span>⏱️ {formatDuration(task.estimated_minutes)}</span>
                          <span style={{ color: getPriorityColor(task.priority_score) }}>
                            {getPriorityLabel(task.priority_score)}
                          </span>
                          {task.status !== 'pending' && (
                            <span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'blue' : 'low'}`}>
                              {task.status}
                            </span>
                          )}
                          {task.is_critical ? <span className="badge badge-critical">Critical</span> : null}
                          {task.can_skip ? <span className="badge badge-low">Skippable</span> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <Link href={`/tasks?projectId=${activeProject.id}`} className="btn btn-ghost w-full" style={{ justifyContent: 'center', marginTop: 4 }}>
                      +{tasks.length - 5} more tasks
                    </Link>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
