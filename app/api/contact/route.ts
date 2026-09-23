import { NextResponse } from 'next/server';
import { queryDb, initializeDatabaseTables } from '@/lib/db';

let memoryMessages: any[] = [];

export async function GET() {
  try {
    const dbRes = await queryDb('SELECT * FROM contact_messages ORDER BY created_at DESC');
    if (dbRes && dbRes.rows.length > 0) {
      const formatted = dbRes.rows.map((r: any) => ({
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
    console.warn('DB fetch messages error:', e);
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
      subject: body.subject,
      message: body.message,
      status: 'unread' as const,
      createdAt: new Date().toISOString(),
    };
    memoryMessages.unshift(newMsg as any);

    try {
      await initializeDatabaseTables();
      await queryDb(
        `INSERT INTO contact_messages (id, user_id, user_name, user_email, subject, message, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newMsg.id,
          newMsg.userId,
          newMsg.userName,
          newMsg.userEmail,
          newMsg.subject,
          newMsg.message,
          newMsg.status,
          newMsg.createdAt,
        ]
      );
    } catch (dbErr) {
      console.warn('DB insert contact message error:', dbErr);
    }

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
