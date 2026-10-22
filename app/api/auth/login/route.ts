import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jbrfuwgcokwwcbmbzeqp.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicmZ1d2djb2t3d2NibWJ6ZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDIyNTUsImV4cCI6MjA5NjA3ODI1NX0.48KNxR9u3R9CnSJtO_h5gs14GEJIfMY8Qq49CSjKLBQ';

/**
 * Authenticate via Supabase Auth REST API
 * This properly verifies bcrypt hashed passwords stored by Supabase
 */
async function supabaseAuthLogin(email: string, password: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    return data;
  } catch (e) {
    console.error('supabaseAuthLogin error:', e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailOrId, password } = body;

    if (!emailOrId || !password) {
      return NextResponse.json({ error: 'Please provide both Email/ID and Password' }, { status: 400 });
    }

    const trimmedInput = emailOrId.trim();
    const trimmedInputLower = trimmedInput.toLowerCase();
    const isEmail = trimmedInputLower.includes('@');

    let loginEmail = trimmedInputLower;

    // Look up user in public.users table with roles relation
    let userProfile: any = null;
    try {
      const { data: users, error: uErr } = await supabaseAdmin
        .from('users')
        .select('*, roles(name)')
        .or(`email.ilike.${trimmedInputLower},username.ilike.${trimmedInputLower},id.eq.${trimmedInputLower}`)
        .limit(1);

      if (users && users.length > 0) {
        userProfile = users[0];
        loginEmail = (userProfile.email || loginEmail).toLowerCase();
      } else if (!isEmail) {
        return NextResponse.json(
          { error: 'No account found with that username or ID. Contact your administrator.' },
          { status: 404 }
        );
      }
    } catch (e) {
      console.warn('Supabase lookup warning:', e);
    }

    // 1. Authenticate via Supabase Auth (bcrypt verification)
    const authResult = await supabaseAuthLogin(loginEmail, password);

    // 2. Fallback verification: legacy plain-text password or demo accounts
    let authenticated = false;
    const authUser = authResult?.user || null;

    if (authUser) {
      authenticated = true;
    } else if (userProfile && userProfile.password && userProfile.password === password) {
      authenticated = true;
    } else if (
      (loginEmail === 'admin@company.com' && password === 'admin123') ||
      (loginEmail === 'intern@company.com' && password === 'intern123')
    ) {
      authenticated = true;
    }

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email/ID and password.' },
        { status: 401 }
      );
    }

    // Determine user role and details
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
      loginEmail.includes('admin') ||
      loginEmail.startsWith('pm_') ||
      loginEmail.startsWith('hr_') ||
      (!internRoles.includes(roleName) && roleName !== '');

    const role: 'intern' | 'admin' = isSuperAdminOrAdmin ? 'admin' : 'intern';
    const name =
      userProfile?.full_name ||
      userProfile?.name ||
      authUser?.user_metadata?.full_name ||
      loginEmail.split('@')[0];
    const userId = userProfile?.id || authUser?.id || `usr_${Date.now()}`;
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
        id: userId,
        name,
        email: loginEmail,
        role,
        department,
        internshipPeriod,
        avatarUrl,
        status: userProfile?.status || 'active',
      },
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message || 'Authentication error' }, { status: 500 });
  }
}
