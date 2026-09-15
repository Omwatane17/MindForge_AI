import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { calculateRisk } from '@/lib/ai';

// GET single project with full details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();

    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index').all(id);
    const dependencies = db.prepare(`
      SELECT td.* FROM task_dependencies td
      JOIN tasks t ON t.id = td.task_id
      WHERE t.project_id = ?
    `).all(id);
    const actionPlan = db.prepare('SELECT ap.*, t.title as task_title FROM action_plans ap JOIN tasks t ON t.id = ap.task_id WHERE ap.project_id = ? ORDER BY ap.day_number, ap.planned_date').all(id);
    const mindMap = db.prepare('SELECT * FROM mind_maps WHERE project_id = ?').get(id) as any;

    // Recalculate risk
    const completedMinutes = (tasks as any[]).filter(t => t.status === 'completed').reduce((sum: number, t: any) => sum + t.estimated_minutes, 0);
    const totalMinutes = (tasks as any[]).reduce((sum: number, t: any) => sum + t.estimated_minutes, 0);
    const risk = calculateRisk(completedMinutes, totalMinutes, project.deadline);

    // Update survival score in DB
    db.prepare('UPDATE projects SET survival_score = ?, risk_level = ?, predicted_delay_hours = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(risk.survivalScore, risk.riskLevel, risk.predictedDelayHours, id);

    return NextResponse.json({
      project: { ...project, survival_score: risk.survivalScore, risk_level: risk.riskLevel },
      tasks,
      dependencies,
      actionPlan,
      mindMap: mindMap ? { nodes: JSON.parse(mindMap.nodes), edges: JSON.parse(mindMap.edges) } : null,
      risk,
    });
  } catch (err) {
    console.error('Project GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PATCH update project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const body = await req.json();
    const allowedFields = ['title', 'description', 'deadline', 'status'];
    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return NextResponse.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE project
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
