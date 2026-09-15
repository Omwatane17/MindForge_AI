import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const db = getDb();

    // Get next 14 days of availability
    const availability: any[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = db.prepare('SELECT * FROM calendar_availability WHERE user_id = ? AND date = ?').get(userId, dateStr) as any;
      availability.push(existing || { date: dateStr, available_hours: 8, notes: '' });
    }

    return NextResponse.json(availability);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { date, availableHours, notes } = await req.json();

    if (!date || availableHours === undefined) {
      return NextResponse.json({ error: 'Date and available hours required' }, { status: 400 });
    }

    if (availableHours < 0 || availableHours > 24) {
      return NextResponse.json({ error: 'Available hours must be between 0 and 24' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO calendar_availability (id, user_id, date, available_hours, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET available_hours = excluded.available_hours, notes = excluded.notes
    `).run(generateId(), userId, date, availableHours, notes || '');

    return NextResponse.json({ date, availableHours, notes });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
  }
}
