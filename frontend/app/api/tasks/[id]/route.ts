import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

// PATCH update task status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();

    // Verify task belongs to user's project
    const task = db.prepare(`
      SELECT t.* FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ? AND p.user_id = ?
    `).get(id, userId) as any;

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const body = await req.json();
    const { status, actualMinutes } = body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'completed') {
        updates.push("completed_at = datetime('now')");
      } else if (status === 'in_progress') {
        updates.push('completed_at = NULL');
      }
    }

    if (actualMinutes !== undefined) {
      updates.push('actual_minutes = ?');
      values.push(actualMinutes);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // After completing/skipping, update next task in action plan
    if (status === 'completed' || status === 'skipped') {
      db.prepare("UPDATE action_plans SET status = ? WHERE task_id = ?").run(status, id);
    }

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return NextResponse.json(updatedTask);
  } catch (err) {
    console.error('Task PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
