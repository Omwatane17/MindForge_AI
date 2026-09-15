import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { generateTasks, generateActionPlan } from '@/lib/ai';

// GET all projects for user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.*, 
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(userId);

    return NextResponse.json(projects);
  } catch (err) {
    console.error('Projects GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST create new project
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { goal, deadline, priority, estimatedEffortHours, description } = await req.json();

    if (!goal || !deadline) {
      return NextResponse.json({ error: 'Goal and deadline are required' }, { status: 400 });
    }

    const db = getDb();
    const projectId = generateId();

    // Create project
    db.prepare(`
      INSERT INTO projects (id, user_id, title, description, goal, deadline, status, total_estimated_hours, survival_score)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 100)
    `).run(projectId, userId, goal.slice(0, 100), description || goal, goal, deadline, estimatedEffortHours || 20);

    // Generate tasks with AI
    const { tasks, dependencies } = await generateTasks(goal, deadline, estimatedEffortHours || 20);

    // Store tasks (remap AI IDs to real UUIDs)
    const idMap: Record<string, string> = {};
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, priority_score, estimated_minutes, status, is_critical, can_skip, why_priority, order_index)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `);

    for (const task of tasks) {
      const realId = generateId();
      idMap[task.id] = realId;
      insertTask.run(realId, projectId, task.title, task.description, task.priorityScore, task.estimatedMinutes, task.isCritical ? 1 : 0, task.canSkip ? 1 : 0, task.whyPriority, task.orderIndex);
    }

    // Store dependencies
    const insertDep = db.prepare(`INSERT INTO task_dependencies (id, task_id, depends_on_task_id) VALUES (?, ?, ?)`);
    for (const dep of dependencies) {
      const taskRealId = idMap[dep.taskId];
      const depRealId = idMap[dep.dependsOnTaskId];
      if (taskRealId && depRealId) {
        insertDep.run(generateId(), taskRealId, depRealId);
      }
    }

    // Generate action plan
    const tasksForPlan = tasks.map(t => ({ id: idMap[t.id], title: t.title, estimatedMinutes: t.estimatedMinutes, priorityScore: t.priorityScore }));
    const plan = await generateActionPlan(tasksForPlan, deadline, 8);
    
    const insertPlan = db.prepare(`
      INSERT INTO action_plans (id, project_id, task_id, day_number, planned_date, planned_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);
    for (const p of plan) {
      insertPlan.run(generateId(), projectId, p.taskId, p.dayNumber, p.plannedDate, p.plannedHours);
    }

    // Update project total hours
    db.prepare('UPDATE projects SET total_estimated_hours = ? WHERE id = ?')
      .run(tasks.reduce((sum, t) => sum + t.estimatedMinutes / 60, 0), projectId);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const storedTasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index').all(projectId);

    return NextResponse.json({ project, tasks: storedTasks }, { status: 201 });
  } catch (err: any) {
    console.error('Projects POST error:', err);
    return NextResponse.json({ error: 'Failed to create project: ' + err.message }, { status: 500 });
  }
}
