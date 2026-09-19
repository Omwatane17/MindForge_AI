'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import VoiceTextInput from '@/components/VoiceTextInput';
import ExportPdfButton from '@/components/ExportPdfButton';
import Link from 'next/link';
import { formatDuration, getPriorityColor, getPriorityLabel, daysUntil, formatDate } from '@/lib/utils';

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
  const [savingDeadline, setSavingDeadline] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const loadProjects = useCallback(async (preferredId?: string) => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          setActiveProject((prev: any) => {
            if (preferredId) {
              const found = data.find((p: any) => p.id === preferredId);
              if (found) return found;
            }
            if (prev) {
              const stillExists = data.find((p: any) => p.id === prev.id);
              if (stillExists) return stillExists;
            }
            return data[0];
          });
        } else {
          setActiveProject(null);
        }
      }
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      const urlParams = new URLSearchParams(window.location.search);
      const projId = urlParams.get('projectId');
      loadProjects(projId || undefined);
    }
  }, [status, loadProjects]);

  useEffect(() => {
    if (!activeProject?.id) return;
    let isCurrent = true;
    const loadDetail = async () => {
      try {
        const detailRes = await fetch(`/api/projects/${activeProject.id}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          if (isCurrent) {
            setProjectDetail(data);
            if (data.nextTask) setNextTask(data.nextTask);
          }
        }
      } catch { }
    };
    loadDetail();
    return () => { isCurrent = false; };
  }, [activeProject?.id]);

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
      setParsedGoal({
        ...data,
        deadline: data.deadline || '',
      });
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
        body: JSON.stringify({
          ...parsedGoal,
          deadline: parsedGoal.deadline ? parsedGoal.deadline.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowNewProject(false);
      setParsedGoal(null);
      await loadProjects(data.project?.id);
      setActiveProject(data.project);
    } catch (err: any) {
      setInputError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateDeadline = async (newDeadline: string) => {
    if (!activeProject) return;
    setSavingDeadline(true);
    const deadlineVal = newDeadline.trim();
    setActiveProject((prev: any) => ({ ...prev, deadline: deadlineVal }));
    setProjects((prev) => prev.map((p) => p.id === activeProject.id ? { ...p, deadline: deadlineVal } : p));
    setProjectDetail((prev: any) => prev ? {
      ...prev,
      project: { ...(prev.project || {}), deadline: deadlineVal }
    } : prev);

    try {
      await fetch(`/api/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadlineVal }),
      });
      const detailRes = await fetch(`/api/projects/${activeProject.id}`);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setProjectDetail(data);
        if (data.nextTask) setNextTask(data.nextTask);
      }
    } catch (err) {
      console.error('Failed to update deadline:', err);
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleTaskAction = async (taskId: string, newStatus: string) => {
    // Optimistic UI update for instant feedback
    setProjectDetail((prev: any) => {
      if (!prev?.tasks) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t)
      };
    });

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (activeProject) {
        const detailRes = await fetch(`/api/projects/${activeProject.id}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setProjectDetail(data);
          if (data.nextTask) setNextTask(data.nextTask);
        }
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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <ExportPdfButton
                project={projectDetail?.project || activeProject}
                projectId={activeProject.id}
                tasks={projectDetail?.tasks || []}
                dependencies={projectDetail?.dependencies || []}
                mindMap={projectDetail?.mindMap || null}
                risk={projectDetail?.risk || null}
                label="Export PDF"
              />
              <Link href="/rescue" className="btn btn-danger btn-sm" id="open-rescue-btn">
                🚨 Rescue Mode
              </Link>
            </div>
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
            <div className="modal animate-scale-in" style={{ maxWidth: 540 }}>
              <h3 style={{ marginBottom: 16 }}>🤖 AI Understood Your Goal</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>Goal</div>
                  <div style={{ fontWeight: 700 }}>{parsedGoal.goal}</div>
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  {/* Custom Deadline Section */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label htmlFor="custom-deadline-picker" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                        📅 Deadline
                      </label>
                      {parsedGoal.deadline && (
                        <button
                          type="button"
                          onClick={() => setParsedGoal({ ...parsedGoal, deadline: '' })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            padding: '0 4px',
                          }}
                          id="clear-custom-deadline-btn"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      id="custom-deadline-picker"
                      type="date"
                      value={parsedGoal.deadline || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setParsedGoal({ ...parsedGoal, deadline: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                    <div style={{ marginTop: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                      {parsedGoal.deadline ? (
                        <span style={{ color: daysUntil(parsedGoal.deadline) < 3 ? 'var(--danger)' : 'var(--brand-blue)' }}>
                          {formatDate(parsedGoal.deadline)}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 400 }}>
                            {daysUntil(parsedGoal.deadline) > 0 ? `${daysUntil(parsedGoal.deadline)} days from now` : daysUntil(parsedGoal.deadline) === 0 ? 'Due today' : 'Past date'}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          No deadline set
                        </span>
                      )}
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
            {/* Active Project & Deadline Setting Bar */}
            <div className="card mb-20" style={{ padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ minWidth: 200, flex: 1 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Active Goal
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {activeProject.title || activeProject.goal}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Deadline
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: activeProject.deadline ? 'var(--brand-blue)' : 'var(--text-muted)' }}>
                        {formatDate(activeProject.deadline)}
                      </span>
                      {activeProject.deadline && daysUntil(activeProject.deadline) > 0 && (
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {daysUntil(activeProject.deadline)}d left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date picker to change/set project deadline */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="date"
                      id="edit-project-deadline-input"
                      value={activeProject.deadline || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleUpdateDeadline(e.target.value)}
                      title="Select or edit deadline for this project"
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                    {activeProject.deadline && (
                      <button
                        type="button"
                        onClick={() => handleUpdateDeadline('')}
                        className="btn btn-ghost btn-sm"
                        title="Remove deadline"
                        style={{ fontSize: '0.72rem', padding: '4px 8px', color: 'var(--text-muted)' }}
                      >
                        Clear
                      </button>
                    )}
                    {savingDeadline && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>Saving...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

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

            {/* Top stats: Only Progress and Remaining Work */}
            <div className="grid-2 mb-24">
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
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Great job meeting your goals.</div>
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
