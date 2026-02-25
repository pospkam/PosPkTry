import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook - GitHub webhook for automatic deployment
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();
    
    // Verify GitHub signature
    const secret = process.env.WEBHOOK_SECRET || '';
    if (secret && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(body);

    // Only deploy on push to main branch
    if (payload.ref !== 'refs/heads/main') {
      return NextResponse.json({
        message: 'Not main branch, skipping deployment'
      });
    }

    // Execute deployment script
    if (process.env.NODE_ENV === 'production') {
      const { stdout, stderr } = await execAsync('/usr/local/bin/kamhub-update');
      
      console.log('Deployment stdout:', stdout);
      if (stderr) console.error('Deployment stderr:', stderr);

      return NextResponse.json({
        message: 'Deployment successful',
        output: stdout
      });
    } else {
      return NextResponse.json({
        message: 'Deployment skipped (not production)'
      });
    }

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Deployment failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhook - Webhook status
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'GitHub webhook endpoint',
    environment: process.env.NODE_ENV
  });
}
