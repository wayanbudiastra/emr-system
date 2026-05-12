import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dokterService } from '@/services/dokter.service';

export async function GET() {
  const session = await auth();
  if (!session?.user)                              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN')         return NextResponse.json({ error: 'Forbidden' },   { status: 403 });

  const data = await dokterService.getUsersWithoutProfile();
  return NextResponse.json(data);
}
