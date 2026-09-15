import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { generateActionPlan } from '@/lib/ai';

// GET action plan for a project
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

    const plan = db.prepare(`
      SELECT ap.*, t.title as task_title, t.estimated_minutes, t.status as task_status, t.priority_score
      FROM action_plans ap
      JOIN tasks t ON t.id = ap.task_id
      WHERE ap.project_id = ?
      ORDER BY ap.day_number, ap.planned_date
    `).all(projectId);

    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch action plan' }, { status: 500 });
  }
}

// POST regenerate action plan
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

    const tasks = db.prepare(`
      SELECT * FROM tasks WHERE project_id = ? AND status NOT IN ('completed', 'skipped')
      ORDER BY priority_score DESC
    `).all(projectId) as any[];

    // Delete old plan
    db.prepare('DELETE FROM action_plans WHERE project_id = ?').run(projectId);

    // Generate new plan
    const plan = await generateActionPlan(
      tasks.map((t: any) => ({ id: t.id, title: t.title, estimatedMinutes: t.estimated_minutes, priorityScore: t.priority_score })),
      project.deadline,
      availableHoursPerDay
    );

    const insert = db.prepare('INSERT INTO action_plans (id, project_id, task_id, day_number, planned_date, planned_hours, status) VALUES (?, ?, ?, ?, ?, ?, \'pending\')');
    for (const p of plan) {
      insert.run(generateId(), projectId, p.taskId, p.dayNumber, p.plannedDate, p.plannedHours);
    }

    const newPlan = db.prepare(`
      SELECT ap.*, t.title as task_title, t.estimated_minutes
      FROM action_plans ap JOIN tasks t ON t.id = ap.task_id
      WHERE ap.project_id = ? ORDER BY ap.day_number
    `).all(projectId);

    return NextResponse.json(newPlan);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to regenerate action plan' }, { status: 500 });
  }
}
