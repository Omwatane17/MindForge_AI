import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { activateRescueMode } from '@/lib/ai';
import { calculateRisk } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { projectId, availableHours } = await req.json();

    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any;
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as any[];

    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const requiredHours = pendingTasks.reduce((sum: number, t: any) => sum + t.estimated_minutes / 60, 0);

    const effectiveAvailableHours = availableHours ?? (() => {
      const deadline = new Date(project.deadline);
      const now = new Date();
      return Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)) * 0.7; // 70% efficiency factor
    })();

    const rescuePlan = await activateRescueMode(
      effectiveAvailableHours,
      pendingTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        estimatedMinutes: t.estimated_minutes,
        isCritical: Boolean(t.is_critical),
        canSkip: Boolean(t.can_skip),
        status: t.status,
        priorityScore: t.priority_score,
      }))
    );

    // Save rescue session
    const rescueId = generateId();
    db.prepare(`
      INSERT INTO rescue_sessions (id, project_id, available_hours, required_hours, critical_tasks, skip_tasks, time_saved_hours, new_survival_score, new_completion_estimate, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      rescueId,
      projectId,
      effectiveAvailableHours,
      requiredHours,
      JSON.stringify(rescuePlan.criticalTasks),
      JSON.stringify(rescuePlan.skipTasks),
      rescuePlan.timeSavedHours,
      rescuePlan.newSurvivalScore,
      rescuePlan.newCompletionEstimate
    );

    // Update task criticality based on rescue plan
    for (const taskId of rescuePlan.criticalTasks) {
      db.prepare('UPDATE tasks SET is_critical = 1 WHERE id = ?').run(taskId);
    }
    for (const taskId of rescuePlan.skipTasks) {
      db.prepare('UPDATE tasks SET can_skip = 1 WHERE id = ?').run(taskId);
    }

    // Update project survival score
    db.prepare("UPDATE projects SET survival_score = ?, risk_level = 'critical', updated_at = datetime('now') WHERE id = ?")
      .run(rescuePlan.newSurvivalScore, projectId);

    return NextResponse.json({
      rescueId,
      availableHours: effectiveAvailableHours,
      requiredHours,
      ...rescuePlan,
      tasks: tasks.map((t: any) => ({
        ...t,
        isCritical: rescuePlan.criticalTasks.includes(t.id),
        shouldSkip: rescuePlan.skipTasks.includes(t.id),
      })),
    });
  } catch (err: any) {
    console.error('Rescue mode error:', err);
    return NextResponse.json({ error: 'Failed to activate rescue mode: ' + err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const projectId = req.nextUrl.searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const rescue = db.prepare('SELECT * FROM rescue_sessions WHERE project_id = ? AND is_active = 1 ORDER BY triggered_at DESC LIMIT 1').get(projectId) as any;

    if (!rescue) return NextResponse.json({ active: false });

    return NextResponse.json({
      active: true,
      ...rescue,
      criticalTasks: JSON.parse(rescue.critical_tasks),
      skipTasks: JSON.parse(rescue.skip_tasks),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch rescue status' }, { status: 500 });
  }
}
