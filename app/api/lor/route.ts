import { NextResponse } from 'next/server';
import { queryDb, initializeDatabaseTables } from '@/lib/db';
import { INITIAL_LOR } from '@/lib/mock-data';

let memoryLorMap: Record<string, any> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const email = searchParams.get('email') || searchParams.get('userEmail') || '';
    const name = searchParams.get('name') || searchParams.get('userName') || '';

    if (userId || email || name) {
      await initializeDatabaseTables();
      const dbRes = await queryDb(
        `SELECT * FROM lors
         WHERE user_id = $1
            OR (user_email IS NOT NULL AND user_email != '' AND LOWER(user_email) = LOWER($2))
            OR (user_name IS NOT NULL AND user_name != '' AND LOWER(user_name) = LOWER($3))
         ORDER BY (CASE WHEN status = 'issued' THEN 1 ELSE 2 END), issued_at DESC
         LIMIT 1`,
        [userId, email, name]
      );

      if (dbRes && dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        const formatted = {
          id: row.id,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: row.user_name,
          department: row.department,
          internshipPeriod: row.internship_period,
          letterheadBgUrl: row.letterhead_bg_url,
          blocks: typeof row.blocks === 'string' ? JSON.parse(row.blocks) : row.blocks,
          status: row.status,
          issuedAt: row.issued_at,
          issuedBy: row.issued_by,
        };
        return NextResponse.json({ lor: formatted });
      }

      // Memory map lookup fallback
      const memoryValues = Object.values(memoryLorMap);
      const memoryMatch =
        memoryValues.find(
          (item: any) =>
            item.status === 'issued' &&
            (item.userId === userId ||
              (email && item.userEmail && item.userEmail.toLowerCase() === email.toLowerCase()) ||
              (name && item.userName && item.userName.toLowerCase() === name.toLowerCase()))
        ) ||
        memoryValues.find(
          (item: any) =>
            item.userId === userId ||
            (email && item.userEmail && item.userEmail.toLowerCase() === email.toLowerCase()) ||
            (name && item.userName && item.userName.toLowerCase() === name.toLowerCase())
        );

      if (memoryMatch) {
        return NextResponse.json({ lor: memoryMatch });
      }

      // Default unissued LOR for this user
      return NextResponse.json({
        lor: {
          ...INITIAL_LOR,
          id: `lor_${userId || 'default'}`,
          userId: userId,
          userEmail: email,
          userName: name,
          status: 'draft',
        },
      });
    }

    // General fallback for admin editor (latest issued or updated LOR)
    const dbRes = await queryDb('SELECT * FROM lors ORDER BY issued_at DESC LIMIT 1');
    if (dbRes && dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      return NextResponse.json({
        lor: {
          id: row.id,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: row.user_name,
          department: row.department,
          internshipPeriod: row.internship_period,
          letterheadBgUrl: row.letterhead_bg_url,
          blocks: typeof row.blocks === 'string' ? JSON.parse(row.blocks) : row.blocks,
          status: row.status,
          issuedAt: row.issued_at,
          issuedBy: row.issued_by,
        },
      });
    }
  } catch (e) {
    console.warn('DB fetch error for LOR:', e);
  }

  return NextResponse.json({
    lor: {
      ...INITIAL_LOR,
      status: 'draft',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || 'usr_default';
    const userEmail = body.userEmail || '';
    const userName = body.userName || '';

    const lorRecord = {
      ...INITIAL_LOR,
      ...body,
      id: body.id || `lor_${userId}`,
      userId: userId,
      userEmail: userEmail,
      userName: userName,
    };

    if (userId) memoryLorMap[userId] = lorRecord;
    if (userEmail) memoryLorMap[userEmail.toLowerCase()] = lorRecord;
    if (userName) memoryLorMap[userName.toLowerCase()] = lorRecord;

    try {
      await initializeDatabaseTables();

      // Find if an existing row matches user_id, user_email, or user_name
      const existingRes = await queryDb(
        `SELECT id FROM lors
         WHERE user_id = $1
            OR (user_email IS NOT NULL AND user_email != '' AND LOWER(user_email) = LOWER($2))
            OR (user_name IS NOT NULL AND user_name != '' AND LOWER(user_name) = LOWER($3))
         LIMIT 1`,
        [userId, userEmail, userName]
      );

      const targetId = existingRes && existingRes.rows.length > 0 ? existingRes.rows[0].id : lorRecord.id;

      await queryDb(
        `INSERT INTO lors (id, user_id, user_name, user_email, department, internship_period, letterhead_bg_url, blocks, status, issued_at, issued_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         user_name = EXCLUDED.user_name,
         user_email = EXCLUDED.user_email,
         department = EXCLUDED.department,
         internship_period = EXCLUDED.internship_period,
         blocks = EXCLUDED.blocks,
         letterhead_bg_url = EXCLUDED.letterhead_bg_url,
         status = EXCLUDED.status,
         issued_at = EXCLUDED.issued_at,
         issued_by = EXCLUDED.issued_by`,
        [
          targetId,
          lorRecord.userId,
          lorRecord.userName,
          lorRecord.userEmail,
          lorRecord.department,
          lorRecord.internshipPeriod,
          lorRecord.letterheadBgUrl || '',
          JSON.stringify(lorRecord.blocks),
          lorRecord.status,
          lorRecord.issuedAt || new Date().toISOString(),
          lorRecord.issuedBy || 'Admin',
        ]
      );
    } catch (dbErr) {
      console.warn('DB insert/update LOR error:', dbErr);
    }

    return NextResponse.json({ success: true, lor: lorRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Saving LOR failed' }, { status: 500 });
  }
}
