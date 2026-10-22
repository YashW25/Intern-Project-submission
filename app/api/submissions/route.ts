import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

let memorySubmissions: any[] = [];

export async function GET() {
  try {
    const { data: dbRows, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (dbRows && dbRows.length > 0) {
      const formatted = dbRows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        projectTitle: row.project_title,
        description: row.description,
        zipFileId: row.zip_file_id,
        zipFileName: row.zip_file_name,
        fileTree: typeof row.file_tree === 'string' ? JSON.parse(row.file_tree) : row.file_tree,
        files: typeof row.files === 'string' ? JSON.parse(row.files) : row.files,
        status: row.status,
        grade: row.grade,
        feedback: row.feedback,
        submittedAt: row.submitted_at,
      }));
      return NextResponse.json({ submissions: formatted });
    }
  } catch (e) {
    console.warn('Submissions DB fetch error:', e);
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
      projectTitle: body.projectTitle || 'Internship Project',
      description: body.description || '',
      zipFileId: body.zipFileId || '',
      zipFileName: body.zipFileName || 'submission.zip',
      fileTree: body.fileTree || [],
      files: body.files || [],
      status: 'submitted' as const,
      submittedAt: new Date().toISOString(),
    };

    memorySubmissions.unshift(newSubmission);

    try {
      await supabaseAdmin.from('submissions').insert({
        id: newSubmission.id,
        user_id: newSubmission.userId,
        user_name: newSubmission.userName,
        user_email: newSubmission.userEmail,
        project_title: newSubmission.projectTitle,
        description: newSubmission.description,
        zip_file_id: newSubmission.zipFileId,
        zip_file_name: newSubmission.zipFileName,
        file_tree: newSubmission.fileTree,
        files: newSubmission.files,
        status: newSubmission.status,
        submitted_at: newSubmission.submittedAt,
      });
    } catch (dbErr) {
      console.warn('Submissions DB insert warning:', dbErr);
    }

    return NextResponse.json({ success: true, submission: newSubmission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, grade, feedback, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (grade !== undefined) updates.grade = grade;
    if (feedback !== undefined) updates.feedback = feedback;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Submission update warning:', error);
    }

    // Also update in memorySubmissions
    memorySubmissions = memorySubmissions.map((s) => (s.id === id ? { ...s, ...updates } : s));

    return NextResponse.json({ success: true, submission: data || updates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
