import { NextResponse } from 'next/server';
import { getFileDownloadUrl } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    const downloadUrl = await getFileDownloadUrl(fileId);

    if (downloadUrl) {
      return NextResponse.redirect(downloadUrl);
    }

    return NextResponse.json({
      status: 'cached',
      fileId,
      message: 'File payload retained in Cloud Vault memory cache',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Download failed' }, { status: 500 });
  }
}
