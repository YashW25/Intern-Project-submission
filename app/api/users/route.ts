import { NextResponse } from 'next/server';
import { queryDb, initializeDatabaseTables } from '@/lib/db';

export async function GET() {
  try {
    await initializeDatabaseTables();
    const dbRes = await queryDb('SELECT * FROM users');
    if (dbRes && dbRes.rows.length > 0) {
      const users = dbRes.rows.map((r: any) => ({
        id: r.id,
        name: r.full_name || r.name || (r.email ? r.email.split('@')[0] : 'Intern'),
        email: r.email || '',
        department: r.department || 'Software Engineering',
        internshipPeriod:
          r.start_date && r.end_date
            ? `${new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
            : 'Active Program',
      }));
      return NextResponse.json({ users });
    }
  } catch (e) {
    console.warn('Users DB fetch warning:', e);
  }

  // Fallback demo interns
  return NextResponse.json({
    users: [
      { id: 'usr_intern_1', name: 'Jeenisha Bhutekar', email: 'jeenisha@company.com', department: 'Software Engineering', internshipPeriod: 'June 2026 - Sept 2026' },
      { id: 'usr_intern_2', name: 'Alex Rivera', email: 'alex@company.com', department: 'Full-Stack Engineering', internshipPeriod: 'June 2026 - Sept 2026' },
    ],
  });
}
