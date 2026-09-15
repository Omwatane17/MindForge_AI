import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGoal } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return NextResponse.json({ error: 'Please provide a valid goal description' }, { status: 400 });
    }

    const result = await parseGoal(text.trim());
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Input API error:', err);
    return NextResponse.json({ error: 'Failed to process input. Please try again.' }, { status: 500 });
  }
}
