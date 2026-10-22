import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    let data: any[] | null = null;

    let targetUserId = userId;
    if (!targetUserId && (email || name)) {
      const conds: string[] = [];
      if (email) conds.push(`email.ilike.${email}`);
      if (name) conds.push(`full_name.ilike.${name}`);
      const { data: u } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(conds.join(','))
        .limit(1)
        .maybeSingle();
      if (u) targetUserId = u.id;
    }

    if (targetUserId) {
      // Fetch ALL original logbooks for this specific user in chronological order
      const res = await supabaseAdmin
        .from('logbooks')
        .select('*, users(full_name, email, signature_path)')
        .eq('user_id', targetUserId)
        .order('date', { ascending: true });

      data = res.data;
    } else if (role === 'admin') {
      // Admin global view: see all logbooks in database
      const res = await supabaseAdmin
        .from('logbooks')
        .select('*, users(full_name, email, signature_path)')
        .order('date', { ascending: true });

      data = res.data;
    } else {
      return NextResponse.json({ logbooks: [] });
    }

    if (!data) {
      return NextResponse.json({ logbooks: [] });
    }

    const formatted = data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.users?.full_name || row.user_name || name || 'Intern',
      userEmail: row.users?.email || row.user_email || email || '',
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      title: row.title || 'Logbook Entry',
      description: row.description || '',
      hoursSpent: parseFloat(row.hours_spent) || 0,
      whatLearned: row.what_learned || '',
      driveLink: row.drive_link || '',
      userSignature: row.users?.signature_path || row.user_signature || null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ logbooks: formatted });
  } catch (error: any) {
    console.error('Logbooks API error:', error);
    return NextResponse.json({ logbooks: [], error: error.message });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, description, hoursSpent, whatLearned, driveLink, date } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title are required' }, { status: 400 });
    }

    const newId = `log_${Date.now()}`;
    const entryDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('logbooks')
      .insert({
        id: newId,
        user_id: userId,
        date: entryDate,
        title,
        description: description || '',
        hours_spent: hoursSpent || 0,
        what_learned: whatLearned || '',
        drive_link: driveLink || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Logbook insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logbook: {
        id: data.id,
        userId: data.user_id,
        date: data.date,
        title: data.title,
        description: data.description || '',
        hoursSpent: data.hours_spent || 0,
        whatLearned: data.what_learned || '',
        driveLink: data.drive_link || '',
      },
    });
  } catch (error: any) {
    console.error('Logbooks API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
