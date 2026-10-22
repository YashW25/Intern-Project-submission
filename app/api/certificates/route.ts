import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  INITIAL_CERTIFICATE,
  replaceCertificatePlaceholders,
} from '@/lib/certificate-defaults';

let memoryCertificateTemplate = { ...INITIAL_CERTIFICATE };
let memoryIssuedCertificates: Record<string, any> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const email = searchParams.get('email') || '';
    const name = searchParams.get('name') || '';
    const role = searchParams.get('role') || '';

    // Check Supabase certificate_templates
    let activeTemplate = { ...memoryCertificateTemplate };
    try {
      const { data: templates } = await supabaseAdmin
        .from('certificate_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (templates && templates.length > 0) {
        const t = templates[0];
        try {
          const parsedBody = JSON.parse(t.body);
          if (parsedBody) {
            activeTemplate = {
              ...activeTemplate,
              id: t.id,
              ...parsedBody,
            };
          }
        } catch {
          // Keep activeTemplate defaults
        }
      }
    } catch (e) {
      console.warn('Certificate template DB fetch warning:', e);
    }

    // Admin view
    if (role === 'admin' && !userId) {
      const { count } = await supabaseAdmin
        .from('certificates')
        .select('*', { count: 'exact', head: true });

      return NextResponse.json({
        success: true,
        template: activeTemplate,
        issuedCount: count || Object.keys(memoryIssuedCertificates).length,
      });
    }

    // Intern view: check if this intern has an issued certificate
    if (userId || email || name) {
      // 1. Check memory map
      if (userId && memoryIssuedCertificates[userId]) {
        return NextResponse.json({
          success: true,
          certificate: memoryIssuedCertificates[userId],
        });
      }
      if (email && memoryIssuedCertificates[email.toLowerCase()]) {
        return NextResponse.json({
          success: true,
          certificate: memoryIssuedCertificates[email.toLowerCase()],
        });
      }

      // 2. Resolve target user from Supabase if needed
      let targetUserId = userId;
      let matchedUserObj: any = null;

      if (targetUserId) {
        const { data: uRows } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email, employee_code, start_date, end_date')
          .eq('id', targetUserId)
          .limit(1);
        if (uRows && uRows.length > 0) matchedUserObj = uRows[0];
      } else if (email || name) {
        const conditions: string[] = [];
        if (email) conditions.push(`email.ilike.${email}`);
        if (name) conditions.push(`full_name.ilike.${name}`);
        const { data: uRows } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email, employee_code, start_date, end_date')
          .or(conditions.join(','))
          .limit(1);
        if (uRows && uRows.length > 0) {
          matchedUserObj = uRows[0];
          targetUserId = matchedUserObj.id;
        }
      }

      // 3. Query Supabase certificates table
      if (targetUserId) {
        const { data: certRows } = await supabaseAdmin
          .from('certificates')
          .select('*')
          .eq('user_id', targetUserId)
          .limit(1);

        if (certRows && certRows.length > 0) {
          const row = certRows[0];
          const userObj = matchedUserObj || {};
          const internData = {
            id: targetUserId,
            name: userObj.full_name || name || 'Intern',
            employeeCode: userObj.employee_code || 'INT0595',
            department: searchParams.get('department') || 'Software Engineering',
            internshipPeriod:
              userObj.start_date && userObj.end_date
                ? `${new Date(userObj.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(userObj.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                : searchParams.get('internshipPeriod') || 'June 2026 – Sept 2026',
          };

          const rawNum = (internData.employeeCode || internData.id || '595').replace(/[^0-9]/g, '');
          const certNum = row.certificate_number || `CERT/${rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595'}`;

          const resolvedBlocks = activeTemplate.blocks.map((b: any) => ({
            ...b,
            text: replaceCertificatePlaceholders(b.text, { ...internData, certificateNumber: certNum }),
          }));

          const cert = {
            ...activeTemplate,
            id: row.id,
            userId: targetUserId,
            userName: internData.name,
            userEmail: userObj.email || email,
            certificateNumber: certNum,
            blocks: resolvedBlocks,
            status: 'issued' as const,
            issuedAt: row.issued_at || row.created_at || '2026-10-01T00:00:00.000Z',
          };

          return NextResponse.json({ success: true, certificate: cert });
        }
      }

      // 4. Fallback: If template is published as issued, derive certificate for this intern
      if (activeTemplate.status === 'issued') {
        const userObj = matchedUserObj || {};
        const internData = {
          id: targetUserId || userId || 'usr_active',
          name: userObj.full_name || name || 'Intern',
          employeeCode: userObj.employee_code || searchParams.get('employeeCode') || 'INT0595',
          department: searchParams.get('department') || 'Software Engineering',
          internshipPeriod:
            userObj.start_date && userObj.end_date
              ? `${new Date(userObj.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(userObj.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
              : searchParams.get('internshipPeriod') || 'June 2026 – Sept 2026',
        };

        const rawNum = (internData.employeeCode || internData.id || '595').replace(/[^0-9]/g, '');
        const certNum = `CERT/${rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595'}`;

        const resolvedBlocks = activeTemplate.blocks.map((b) => ({
          ...b,
          text: replaceCertificatePlaceholders(b.text, { ...internData, certificateNumber: certNum }),
        }));

        const cert = {
          ...activeTemplate,
          id: `cert_${targetUserId || userId || Date.now()}`,
          userId: targetUserId || userId,
          userName: internData.name,
          userEmail: userObj.email || email,
          certificateNumber: certNum,
          blocks: resolvedBlocks,
          status: 'issued' as const,
          issuedAt: activeTemplate.issuedAt || '2026-10-01T00:00:00.000Z',
        };

        return NextResponse.json({ success: true, certificate: cert });
      }

      // Not yet issued
      return NextResponse.json({
        success: true,
        certificate: {
          ...activeTemplate,
          userId,
          userName: name,
          userEmail: email,
          status: 'draft',
        },
      });
    }

    return NextResponse.json({ success: true, template: activeTemplate });
  } catch (err: any) {
    console.error('Certificates GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, template, interns } = body;

    // Action 1: Save Certificate Template
    if (action === 'save_template' || (!action && template)) {
      const t = template || body;
      memoryCertificateTemplate = { ...memoryCertificateTemplate, ...t };

      try {
        const templateId = t.id && t.id.includes('-') ? t.id : 'a0000000-0000-0000-0000-000000000001';
        await supabaseAdmin.from('certificate_templates').upsert({
          id: templateId,
          name: t.title || 'Official Internship Completion Certificate',
          body: JSON.stringify(t),
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Save template DB warning:', dbErr);
      }

      return NextResponse.json({ success: true, template: memoryCertificateTemplate });
    }

    // Action 2: Batch Issue Certificates to Interns
    if (action === 'issue_batch' && Array.isArray(interns)) {
      const issuedList: any[] = [];
      const currentTemplate = template || memoryCertificateTemplate;

      for (const intern of interns) {
        if (!intern.id) continue;
        const rawNum = (intern.employeeCode || intern.id || '595').replace(/[^0-9]/g, '');
        const certNum = `CERT/${rawNum ? rawNum.slice(-4).padStart(4, '0') : '0595'}`;

        const resolvedBlocks = currentTemplate.blocks.map((b: any) => ({
          ...b,
          text: replaceCertificatePlaceholders(b.text, intern),
        }));

        const certRecord = {
          ...currentTemplate,
          id: `cert_${intern.id}`,
          userId: intern.id,
          userName: intern.name,
          userEmail: intern.email,
          certificateNumber: certNum,
          blocks: resolvedBlocks,
          status: 'issued',
          issuedAt: new Date().toISOString(),
        };

        memoryIssuedCertificates[intern.id] = certRecord;
        if (intern.email) memoryIssuedCertificates[intern.email.toLowerCase()] = certRecord;
        issuedList.push(certRecord);

        // Record in Supabase certificates table
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(intern.id);
          if (isUuid) {
            const { data: existing } = await supabaseAdmin
              .from('certificates')
              .select('id')
              .eq('user_id', intern.id);

            if (existing && existing.length > 0) {
              await supabaseAdmin
                .from('certificates')
                .update({
                  certificate_number: certNum,
                  eligible: true,
                  issued_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing[0].id);
            } else {
              await supabaseAdmin
                .from('certificates')
                .insert({
                  user_id: intern.id,
                  certificate_number: certNum,
                  eligible: true,
                  issued_at: new Date().toISOString(),
                });
            }
          }
        } catch (dbErr) {
          console.warn('Batch issue DB insert warning:', dbErr);
        }
      }

      memoryCertificateTemplate.status = 'issued';

      // Persist template status: 'issued' to Supabase certificate_templates
      try {
        const templateToSave = { ...currentTemplate, status: 'issued', issuedAt: new Date().toISOString() };
        await supabaseAdmin
          .from('certificate_templates')
          .update({
            body: JSON.stringify(templateToSave),
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'a0000000-0000-0000-0000-000000000001');
      } catch (tplErr) {
        console.warn('Update certificate_templates status warning:', tplErr);
      }

      return NextResponse.json({
        success: true,
        count: issuedList.length,
        certificates: issuedList,
      });
    }

    return NextResponse.json({ error: 'Invalid action or payload' }, { status: 400 });
  } catch (err: any) {
    console.error('Certificates POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
