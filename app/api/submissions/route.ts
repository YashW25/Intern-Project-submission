import { NextResponse } from 'next/server';
import { queryDb, initializeDatabaseTables } from '@/lib/db';

let memorySubmissions: any[] = [];

export async function GET() {
  try {
    const dbRes = await queryDb('SELECT * FROM submissions ORDER BY submitted_at DESC');
    if (dbRes && dbRes.rows.length > 0) {
      const formatted = dbRes.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        projectTitle: row.project_title,
        description: row.description,
        zipFileId: row.zip_file_id,
        zipFileName: row.zip_file_name,
        fileTree: row.file_tree,
        files: row.files,
        status: row.status,
        grade: row.grade,
        feedback: row.feedback,
        submittedAt: row.submitted_at,
      }));
      return NextResponse.json({ submissions: formatted });
    }
  } catch (e) {
    console.warn('DB fetch error:', e);
  }
  return NextResponse.json({ submissions: memorySubmissions });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newSubmission = {
      id: `sub_${Date.now()}`,
      userId: body.userId || 'usr_intern',
      userName: body.userName || 'Intern',
      userEmail: body.userEmail || 'intern@company.com',
      projectTitle: body.projectTitle,
      description: body.description || '',
      zipFileId: body.zipFileId,
      zipFileName: body.zipFileName || 'submission.zip',
      fileTree: body.fileTree || [],
      files: body.files || [],
      status: 'submitted' as const,
      submittedAt: new Date().toISOString(),
    };

    memorySubmissions.unshift(newSubmission);

    // Persist to Supabase Database
    try {
      await initializeDatabaseTables();
      await queryDb(
        `INSERT INTO submissions (id, user_id, user_name, user_email, project_title, description, zip_file_id, zip_file_name, file_tree, files, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newSubmission.id,
          newSubmission.userId,
          newSubmission.userName,
          newSubmission.userEmail,
          newSubmission.projectTitle,
          newSubmission.description,
          newSubmission.zipFileId,
          newSubmission.zipFileName,
          JSON.stringify(newSubmission.fileTree),
          JSON.stringify(newSubmission.files),
          newSubmission.status,
          newSubmission.submittedAt,
        ]
      );
    } catch (dbErr) {
      console.warn('DB insert error:', dbErr);
    }

    return NextResponse.json({ success: true, submission: newSubmission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 500 });
  }
}
