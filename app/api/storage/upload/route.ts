import { NextResponse } from 'next/server';
import { uploadFileToCloudStorage } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadFileToCloudStorage(buffer, file.name, file.type || 'application/zip');

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      downloadUrl: result.url,
    });
  } catch (error: any) {
    console.error('Storage upload API error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
