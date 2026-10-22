import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: dbRows, error } = await supabaseAdmin
      .from('users')
      .select('*, roles(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching interns from DB:', error);
    }

    if (dbRows && dbRows.length > 0) {
      const internRoles = ['INTERN', 'EMPLOYEE'];
      // Filter for interns and employees
      const interns = dbRows.filter((r: any) => {
        const roleName = (r.roles?.name || '').toUpperCase();
        return internRoles.includes(roleName) || !roleName || roleName === '';
      });

      const listToProcess = interns.length > 0 ? interns : dbRows;

      const formatted = listToProcess.map((r: any) => {
        let period = 'June 2026 – Sept 2026';
        if (r.start_date && r.end_date) {
          const s = new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const e = new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          period = `${s} – ${e}`;
        }

        const name = r.full_name || r.name || (r.email ? r.email.split('@')[0] : 'Intern');
        let avatarUrl = r.photo_path || r.avatar_url || '';
        if (!avatarUrl) {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
        }

        return {
          id: r.id,
          employeeCode: r.employee_code || `INT${r.id.substring(0, 4).toUpperCase()}`,
          name,
          email: r.email || '',
          phone: r.phone || '',
          department: r.department || 'Software Engineering',
          internshipPeriod: period,
          govIdLink: r.gov_id_link || null,
          collegeIdLink: r.college_id_link || null,
          addressProofLink: r.address_proof_link || null,
          resumeLink: r.resume_link || null,
          signaturePath: r.signature_path || null,
          documentVerificationStatus: r.document_verification_status || 'pending',
          ndaSigned: !!r.nda_signed,
          ndaSignedAt: r.nda_signed_at || null,
          skills: Array.isArray(r.skills) ? r.skills : [],
          emergencyContact: r.emergency_contact || null,
          status: r.status || 'active',
          avatarUrl,
          createdAt: r.created_at || new Date().toISOString(),
        };
      });

      return NextResponse.json({
        success: true,
        count: formatted.length,
        interns: formatted,
      });
    }

    return NextResponse.json({ success: true, count: 0, interns: [] });
  } catch (err: any) {
    console.error('Interns API error:', err);
    return NextResponse.json({ success: false, error: err.message, interns: [] }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, documentVerificationStatus, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Intern ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (documentVerificationStatus) updates.document_verification_status = documentVerificationStatus;
    if (status) updates.status = status;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, intern: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
