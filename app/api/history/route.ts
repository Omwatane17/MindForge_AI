import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();

    const history = db.prepare(`
      SELECT 
        p.*,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'skipped' THEN 1 ELSE 0 END) as skipped_tasks,
        SUM(t.estimated_minutes) as total_estimated_minutes,
        SUM(CASE WHEN t.status = 'completed' THEN t.estimated_minutes ELSE 0 END) as completed_minutes
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 20
    `).all(userId);

    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
