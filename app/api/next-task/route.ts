import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const projectId = req.nextUrl.searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any;
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index').all(projectId) as any[];
    const dependencies = db.prepare(`
      SELECT td.* FROM task_dependencies td
      JOIN tasks t ON t.id = td.task_id
      WHERE t.project_id = ?
    `).all(projectId) as any[];

    // Find next task: highest priority pending task whose dependencies are all completed
    const completedIds = new Set(tasks.filter(t => t.status === 'completed' || t.status === 'skipped').map(t => t.id));
    const depsMap: Record<string, string[]> = {};
    for (const dep of dependencies) {
      if (!depsMap[dep.task_id]) depsMap[dep.task_id] = [];
      depsMap[dep.task_id].push(dep.depends_on_task_id);
    }

    const eligibleTasks = tasks
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .filter(t => {
        const deps = depsMap[t.id] || [];
        return deps.every(depId => completedIds.has(depId));
      })
      .sort((a, b) => b.priority_score - a.priority_score);

    const nextTask = eligibleTasks[0] || null;
    const queue = eligibleTasks.slice(1, 4);

    return NextResponse.json({
      nextTask,
      queue,
      blockedTasks: tasks.filter(t => {
        if (t.status !== 'pending') return false;
        const deps = depsMap[t.id] || [];
        return deps.some(depId => !completedIds.has(depId));
      }),
    });
  } catch (err) {
    console.error('Next task error:', err);
    return NextResponse.json({ error: 'Failed to get next task' }, { status: 500 });
  }
}
