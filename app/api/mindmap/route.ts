import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { generateMindMap } from '@/lib/ai';

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

    const existing = db.prepare('SELECT * FROM mind_maps WHERE project_id = ?').get(projectId) as any;
    if (existing) {
      return NextResponse.json({ nodes: JSON.parse(existing.nodes), edges: JSON.parse(existing.edges) });
    }

    // Generate mind map
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as any[];
    const { nodes, edges } = await generateMindMap(
      project.goal,
      tasks.map(t => ({ id: t.id, title: t.title, priorityScore: t.priority_score, status: t.status }))
    );

    const mapId = generateId();
    db.prepare('INSERT INTO mind_maps (id, project_id, nodes, edges) VALUES (?, ?, ?, ?)').run(
      mapId, projectId, JSON.stringify(nodes), JSON.stringify(edges)
    );

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get mind map' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { projectId } = await req.json();

    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any;
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as any[];
    const { nodes, edges } = await generateMindMap(
      project.goal,
      tasks.map(t => ({ id: t.id, title: t.title, priorityScore: t.priority_score, status: t.status }))
    );

    db.prepare(`
      INSERT INTO mind_maps (id, project_id, nodes, edges, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(project_id) DO UPDATE SET nodes = excluded.nodes, edges = excluded.edges, updated_at = excluded.updated_at
    `).run(generateId(), projectId, JSON.stringify(nodes), JSON.stringify(edges));

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to regenerate mind map' }, { status: 500 });
  }
}
