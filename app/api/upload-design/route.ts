import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'public', 'design');
    await mkdir(dir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(dir, filename);
    
    await writeFile(filepath, buffer);

    return NextResponse.json({ 
      success: true, 
      files: [filename],
      path: `/design/${filename}` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
