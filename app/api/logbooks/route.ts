import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    let query: string;
    let params: any[];

    if (role === 'admin') {
      // Admin sees all logbooks with user info
      query = `
        SELECT
          l.id,
          l.user_id,
          u.full_name AS user_name,
          u.email AS user_email,
          l.date,
          l.title,
          l.description,
          COALESCE(l.hours_spent::float, 0) AS hours_spent,
          l.what_learned,
          l.drive_link,
          u.signature_path AS user_signature,
          l.created_at,
          l.updated_at
        FROM logbooks l
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.date DESC
        LIMIT 200
      `;
      params = [];
    } else if (userId) {
      // Intern sees only their own logbook entries
      query = `
        SELECT
          l.id,
          l.user_id,
          u.full_name AS user_name,
          u.email AS user_email,
          l.date,
          l.title,
          l.description,
          COALESCE(l.hours_spent::float, 0) AS hours_spent,
          l.what_learned,
          l.drive_link,
          u.signature_path AS user_signature,
          l.created_at,
          l.updated_at
        FROM logbooks l
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.user_id = $1
        ORDER BY l.date DESC
      `;
      params = [userId];
    } else {
      return NextResponse.json({ logbooks: [] });
    }

    const dbRes = await queryDb(query, params);

    if (!dbRes) {
      return NextResponse.json({ logbooks: [] });
    }

    const formatted = dbRes.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || 'Unknown',
      userEmail: row.user_email || '',
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      title: row.title || 'Untitled Entry',
      description: row.description || '',
      hoursSpent: parseFloat(row.hours_spent) || 0,
      whatLearned: row.what_learned || '',
      driveLink: row.drive_link || '',
      userSignature: row.user_signature || null,
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

    await queryDb(
      `INSERT INTO logbooks (id, user_id, date, title, description, hours_spent, what_learned, drive_link, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [newId, userId, entryDate, title, description || '', hoursSpent || 0, whatLearned || '', driveLink || '']
    );

    return NextResponse.json({
      success: true,
      logbook: {
        id: newId,
        userId,
        date: entryDate,
        title,
        description: description || '',
        hoursSpent: hoursSpent || 0,
        whatLearned: whatLearned || '',
        driveLink: driveLink || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Logbook POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
