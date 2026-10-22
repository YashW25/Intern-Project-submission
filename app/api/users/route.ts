import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: dbRows, error } = await supabaseAdmin
      .from('users')
      .select('*, roles(name)');

    if (dbRows && dbRows.length > 0) {
      // Filter interns/employees or all non-superadmin users
      const internRoles = ['INTERN', 'EMPLOYEE'];
      const interns = dbRows.filter((r: any) => {
        const roleName = (r.roles?.name || '').toUpperCase();
        return internRoles.includes(roleName) || !roleName || roleName === '';
      });

      const usersToReturn = interns.length > 0 ? interns : dbRows;

      const formatted = usersToReturn.map((r: any) => {
        let period = 'June 2026 – Sept 2026';
        if (r.start_date && r.end_date) {
          const s = new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const e = new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          period = `${s} – ${e}`;
        }
        return {
          id: r.id,
          name: r.full_name || r.name || (r.email ? r.email.split('@')[0] : 'Intern'),
          email: r.email || '',
          department: r.department || 'Software Engineering',
          internshipPeriod: period,
        };
      });

      return NextResponse.json({ users: formatted });
    }
  } catch (e) {
    console.warn('Users DB fetch warning:', e);
  }

  // Fallback demo interns
  return NextResponse.json({
    users: [
      { id: 'usr_intern_1', name: 'Jeenisha Bhutekar', email: 'jeenisha_bhutekar@innovara.in', department: 'Software Engineering', internshipPeriod: 'June 2026 - Sept 2026' },
      { id: 'usr_intern_2', name: 'Vishal Bhausaheb Yede', email: 'vishal_bhausaheb_yede@innovara.in', department: 'Full-Stack Engineering', internshipPeriod: 'June 2026 - Sept 2026' },
    ],
  });
}
