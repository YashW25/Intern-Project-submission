import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

let memoryMessages: any[] = [];

export async function GET() {
  try {
    const { data: dbRows } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbRows && dbRows.length > 0) {
      const formatted = dbRows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        subject: r.subject,
        message: r.message,
        status: r.status,
        reply: r.reply,
        createdAt: r.created_at,
      }));
      return NextResponse.json({ messages: formatted });
    }
  } catch (e) {
    console.warn('DB fetch messages warning:', e);
  }
  return NextResponse.json({ messages: memoryMessages });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newMsg = {
      id: `msg_${Date.now()}`,
      userId: body.userId || 'usr_intern',
      userName: body.userName || 'Intern',
      userEmail: body.userEmail || 'intern@company.com',
      subject: body.subject || 'Inquiry',
      message: body.message || '',
      status: 'unread' as const,
      createdAt: new Date().toISOString(),
    };
    memoryMessages.unshift(newMsg as any);

    try {
      await supabaseAdmin.from('contact_messages').insert({
        id: newMsg.id,
        user_id: newMsg.userId,
        user_name: newMsg.userName,
        user_email: newMsg.userEmail,
        subject: newMsg.subject,
        message: newMsg.message,
        status: newMsg.status,
        created_at: newMsg.createdAt,
      });
    } catch (dbErr) {
      console.warn('DB insert contact message warning:', dbErr);
    }

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, reply } = body;
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    await supabaseAdmin
      .from('contact_messages')
      .update({ reply, status: 'replied' })
      .eq('id', id);

    memoryMessages = memoryMessages.map((m) =>
      m.id === id ? { ...m, reply, status: 'replied' } : m
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
