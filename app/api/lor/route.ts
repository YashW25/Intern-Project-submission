import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { INITIAL_LOR } from '@/lib/mock-data';

function formatLorRow(row: any) {
  return {
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
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const email = searchParams.get('email') || searchParams.get('userEmail') || '';
    const name = searchParams.get('name') || searchParams.get('userName') || '';
    const role = searchParams.get('role') || '';

    // Fetch all LOR records from database
    const { data: allLors } = await supabaseAdmin
      .from('lors')
      .select('*')
      .order('issued_at', { ascending: false });

    const lorsList = allLors || [];

    // Admin view without specific intern requested: return the latest LOR layout for editor
    if (role === 'admin' && !userId) {
      if (lorsList.length > 0) {
        return NextResponse.json({ lor: formatLorRow(lorsList[0]) });
      }
      return NextResponse.json({ lor: INITIAL_LOR });
    }

    if (userId || email || name) {
      // 1. Check for specific matching row for this user
      const specificMatch = lorsList.find((row: any) => {
        const uIdMatch = userId && row.user_id === userId;
        const emailMatch = email && row.user_email && row.user_email.toLowerCase() === email.toLowerCase();
        const nameMatch = name && row.user_name && row.user_name.toLowerCase() === name.toLowerCase();
        return uIdMatch || emailMatch || nameMatch;
      });

      if (specificMatch) {
        return NextResponse.json({ lor: formatLorRow(specificMatch) });
      }

      // 2. If no individual row exists yet, but the admin already published/issued an LOR:
      // Derive an issued LOR for this intern from the published template!
      const publishedIssuedLor = lorsList.find((r: any) => r.status === 'issued') || lorsList[0];

      if (publishedIssuedLor) {
        const internName = name || 'Intern';
        const internEmail = email || publishedIssuedLor.user_email;
        const internDept = searchParams.get('department') || publishedIssuedLor.department || 'Software Engineering';
        const internPeriod = searchParams.get('internshipPeriod') || publishedIssuedLor.internship_period || 'Active Internship Program';

        // Adapt published blocks with this intern's details
        const sourceBlocks = typeof publishedIssuedLor.blocks === 'string'
          ? JSON.parse(publishedIssuedLor.blocks)
          : publishedIssuedLor.blocks;

        const resolvedBlocks = (sourceBlocks || []).map((b: any) => {
          let text = b.text || '';
          if (publishedIssuedLor.user_name && publishedIssuedLor.user_name !== internName) {
            text = text.replaceAll(publishedIssuedLor.user_name, internName);
          }
          text = text
            .replace(/\{name_full\}/g, internName)
            .replace(/\{name\}/g, internName.split(' ')[0] || internName)
            .replace(/\{role\}/g, internDept)
            .replace(/\{department\}/g, internDept)
            .replace(/\{internship_period\}/g, internPeriod)
            .replace(/\{download_date\}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

          return { ...b, text };
        });

        const derivedLor = {
          id: `lor_${userId || Date.now()}`,
          userId: userId || publishedIssuedLor.user_id,
          userName: internName,
          userEmail: internEmail,
          department: internDept,
          internshipPeriod: internPeriod,
          letterheadBgUrl: publishedIssuedLor.letterhead_bg_url,
          blocks: resolvedBlocks,
          status: 'issued' as const,
          issuedAt: publishedIssuedLor.issued_at || new Date().toISOString(),
          issuedBy: publishedIssuedLor.issued_by || 'Program Administrator',
        };

        // Persist so subsequent queries find it directly
        if (userId) {
          (async () => {
            try {
              await supabaseAdmin
                .from('lors')
                .upsert({
                  id: derivedLor.id,
                  user_id: derivedLor.userId,
                  user_name: derivedLor.userName,
                  user_email: derivedLor.userEmail,
                  department: derivedLor.department,
                  internship_period: derivedLor.internshipPeriod,
                  letterhead_bg_url: derivedLor.letterheadBgUrl,
                  blocks: derivedLor.blocks,
                  status: 'issued',
                  issued_at: derivedLor.issuedAt,
                  issued_by: derivedLor.issuedBy,
                }, { onConflict: 'id' });
            } catch (err) {
              console.warn('Auto-persist LOR warning:', err);
            }
          })();
        }

        return NextResponse.json({ lor: derivedLor });
      }

      // 3. Fallback unissued LOR if no published LOR exists yet
      return NextResponse.json({
        lor: {
          ...INITIAL_LOR,
          id: `lor_${userId || 'default'}`,
          userId,
          userEmail: email,
          userName: name,
          status: 'draft',
        },
      });
    }

    // Default admin fallback
    if (lorsList.length > 0) {
      return NextResponse.json({ lor: formatLorRow(lorsList[0]) });
    }

    return NextResponse.json({ lor: { ...INITIAL_LOR, status: 'draft' } });
  } catch (e: any) {
    console.error('LOR GET API error:', e);
    return NextResponse.json({ lor: { ...INITIAL_LOR, status: 'draft' } });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || 'usr_default';
    const userEmail = body.userEmail || '';
    const userName = body.userName || '';
    const lorId = body.id || `lor_${userId}`;

    const record = {
      id: lorId,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      department: body.department || 'Software Engineering',
      internship_period: body.internshipPeriod || 'Active Program',
      letterhead_bg_url: body.letterheadBgUrl || null,
      blocks: body.blocks || [],
      status: body.status || 'issued',
      issued_at: body.issuedAt || new Date().toISOString(),
      issued_by: body.issuedBy || 'Program Administrator',
    };

    const { data, error } = await supabaseAdmin
      .from('lors')
      .upsert(record, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('LOR POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lor: formatLorRow(data),
    });
  } catch (error: any) {
    console.error('LOR POST API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
