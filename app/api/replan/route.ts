import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { generateActionPlan, calculateRisk } from '@/lib/ai';

// POST dynamic replan - called when user falls behind
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { projectId, availableHoursPerDay = 8 } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any;
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const allTasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as any[];
    const pendingTasks = allTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');

    // Recalculate risk first
    const completedMinutes = allTasks.filter((t: any) => t.status === 'completed').reduce((s: number, t: any) => s + t.estimated_minutes, 0);
    const totalMinutes = allTasks.reduce((s: number, t: any) => s + t.estimated_minutes, 0);
    const risk = calculateRisk(completedMinutes, totalMinutes, project.deadline, availableHoursPerDay);

    // Update project risk
    db.prepare(`UPDATE projects SET survival_score = ?, risk_level = ?, predicted_delay_hours = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(risk.survivalScore, risk.riskLevel, risk.predictedDelayHours, projectId);

    // Regenerate action plan for remaining tasks only
    db.prepare('DELETE FROM action_plans WHERE project_id = ? AND status = \'pending\'').run(projectId);

    const newPlan = await generateActionPlan(
      pendingTasks.map((t: any) => ({ id: t.id, title: t.title, estimatedMinutes: t.estimated_minutes, priorityScore: t.priority_score })),
      project.deadline,
      availableHoursPerDay
    );

    const insert = db.prepare('INSERT INTO action_plans (id, project_id, task_id, day_number, planned_date, planned_hours, status) VALUES (?, ?, ?, ?, ?, ?, \'pending\')');
    for (const p of newPlan) {
      insert.run(generateId(), projectId, p.taskId, p.dayNumber, p.plannedDate, p.plannedHours);
    }

    return NextResponse.json({
      risk,
      planUpdated: true,
      pendingTaskCount: pendingTasks.length,
      message: risk.riskLevel === 'critical' || risk.riskLevel === 'high'
        ? 'Plan updated. Consider activating Rescue Mode.'
        : 'Plan updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to replan: ' + err.message }, { status: 500 });
  }
}
