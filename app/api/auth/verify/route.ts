import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    const email = searchParams.get('email') || '';
    const username = searchParams.get('username') || '';

    if (!id && !email && !username) {
      return NextResponse.json({ success: false, error: 'Identifier required' }, { status: 400 });
    }

    const conditions: string[] = [];
    if (id) conditions.push(`id.eq.${id}`);
    if (email) conditions.push(`email.ilike.${email}`);
    if (username) conditions.push(`username.ilike.${username}`);

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*, roles(name)')
      .or(conditions.join(','))
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userProfile = users[0];
    const roleName = (userProfile?.roles?.name || '').toUpperCase();
    const internRoles = ['INTERN', 'EMPLOYEE'];
    const isSuperAdminOrAdmin =
      userProfile?.employee_code === 'SuperAdmin1' ||
      roleName.includes('ADMIN') ||
      roleName.includes('MANAGER') ||
      roleName.includes('DIRECTOR') ||
      roleName.includes('CEO') ||
      roleName.includes('CTO') ||
      roleName.includes('CFO') ||
      roleName.includes('HR') ||
      roleName.includes('FOUNDER') ||
      (userProfile.email && userProfile.email.includes('admin')) ||
      (userProfile.email && userProfile.email.startsWith('pm_')) ||
      (userProfile.email && userProfile.email.startsWith('hr_')) ||
      (!internRoles.includes(roleName) && roleName !== '');

    const role: 'intern' | 'admin' = isSuperAdminOrAdmin ? 'admin' : 'intern';
    const name = userProfile?.full_name || userProfile?.name || userProfile?.email?.split('@')[0] || 'User';
    const department =
      userProfile?.department ||
      (role === 'admin' ? 'Program Administration & Engineering' : 'Software Engineering');

    let internshipPeriod = 'Active Program';
    if (userProfile?.start_date && userProfile?.end_date) {
      const start = new Date(userProfile.start_date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      const end = new Date(userProfile.end_date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      internshipPeriod = `${start} – ${end}`;
    } else if (role === 'admin') {
      internshipPeriod = 'Directorate Staff';
    }

    let avatarUrl = userProfile?.photo_path || userProfile?.avatar_url || '';
    if (!avatarUrl) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${role === 'admin' ? 'f59e0b' : '6366f1'}&color=fff&size=128`;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        name,
        email: userProfile.email,
        role,
        department,
        internshipPeriod,
        avatarUrl,
        status: userProfile?.status || 'active',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
