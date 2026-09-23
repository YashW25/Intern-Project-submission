import { NextResponse } from 'next/server';
import { queryDb, initializeDatabaseTables } from '@/lib/db';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jbrfuwgcokwwcbmbzeqp.supabase.co';
// Supabase anon key - safe to use server-side for auth
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicmZ1d2djb2t3d2NibWJ6ZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDIyNTUsImV4cCI6MjA5NjA3ODI1NX0.48KNxR9u3R9CnSJtO_h5gs14GEJIfMY8Qq49CSjKLBQ';

/**
 * Authenticate via Supabase Auth REST API
 * This properly verifies bcrypt hashed passwords stored by Supabase
 */
async function supabaseAuthLogin(email: string, password: string) {
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
  return data; // contains access_token, user, etc.
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

    // Ensure DB tables are initialized
    await initializeDatabaseTables();

    // Determine if input looks like an email or a username
    const isEmail = trimmedInputLower.includes('@');

    let loginEmail = trimmedInputLower;

    // If user entered a username (not email), resolve to email first
    if (!isEmail) {
      const usernameRes = await queryDb(
        'SELECT email FROM users WHERE LOWER(username) = $1 OR id::text = $1 LIMIT 1',
        [trimmedInputLower]
      );
      if (usernameRes && usernameRes.rows.length > 0) {
        loginEmail = usernameRes.rows[0].email.toLowerCase();
      } else {
        return NextResponse.json(
          { error: 'No account found with that username. Contact your administrator.' },
          { status: 404 }
        );
      }
    }

    // 1. Authenticate via Supabase Auth (bcrypt password verification)
    const authResult = await supabaseAuthLogin(loginEmail, password);

    if (authResult && authResult.user) {
      const authUser = authResult.user;

      // 2. Fetch the full user profile from public.users table
      const profileRes = await queryDb(
        'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [loginEmail]
      );

      let role: 'intern' | 'admin' = 'intern';
      let name = authUser.user_metadata?.full_name || loginEmail.split('@')[0];
      let department = 'Software Engineering';
      let internshipPeriod = 'Active Program';
      let avatarUrl = '';
      let userId = authUser.id;

      if (profileRes && profileRes.rows.length > 0) {
        const profile = profileRes.rows[0];
        name = profile.full_name || name;
        avatarUrl = profile.photo_path || profile.avatar_url || '';

        // Resolve role from role_id
        if (profile.role_id) {
          const roleRes = await queryDb(
            'SELECT name FROM roles WHERE id = $1 LIMIT 1',
            [profile.role_id]
          );
          if (roleRes && roleRes.rows.length > 0) {
            const roleName = (roleRes.rows[0].name || '').toUpperCase();
            // INTERN and EMPLOYEE get intern dashboard; all management roles get admin
            const internRoles = ['INTERN', 'EMPLOYEE'];
            role = internRoles.includes(roleName) ? 'intern' : 'admin';
          }
        }

        // Build internship period from dates
        if (profile.start_date && profile.end_date) {
          const start = new Date(profile.start_date).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          });
          const end = new Date(profile.end_date).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          });
          internshipPeriod = `${start} – ${end}`;
        }
      }

      // Fallback avatar using UI Avatars
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
          status: 'active',
        },
      });
    }

    // 2. Fallback: check public.users table for plain-text password (legacy accounts)
    const legacyRes = await queryDb(
      'SELECT * FROM users WHERE LOWER(email) = $1 AND password = $2 LIMIT 1',
      [loginEmail, password]
    );

    if (legacyRes && legacyRes.rows.length > 0) {
      const user = legacyRes.rows[0];
      const userRoleName = user.role || '';
      const mapped =
        userRoleName === 'intern' || userRoleName === 'employee' ? 'intern' : 'admin';
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.full_name || user.name || loginEmail.split('@')[0],
          email: loginEmail,
          role: mapped,
          department: 'Software Engineering',
          internshipPeriod: 'Active Program',
          avatarUrl: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.name || 'User')}&background=6366f1&color=fff`,
          status: user.status || 'active',
        },
      });
    }

    // 3. Authentication failed
    return NextResponse.json(
      { error: 'Invalid credentials. Please check your email and password.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message || 'Authentication error' }, { status: 500 });
  }
}
