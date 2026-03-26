import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

const GitHubWebhookSchema = z.object({
  ref: z.string().optional(),
  repository: z.object({
    name: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/webhook - GitHub webhook for automatic deployment
 * AUTH: Public by design — webhooks protected by X-Hub-Signature-256 (HMAC-SHA256).
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();

    // Verify GitHub signature — required, WEBHOOK_SECRET must be configured
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'WEBHOOK_SECRET not configured' },
        { status: 500 }
      );
    }
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: 'Невалидный JSON' },
        { status: 400 }
      );
    }

    const parsed = GitHubWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Невалидная структура webhook' },
        { status: 400 }
      );
    }

    const webhookPayload = parsed.data;

    // Only deploy on push to main branch
    if (webhookPayload.ref !== 'refs/heads/main') {
      return NextResponse.json({
        message: 'Not main branch, skipping deployment'
      });
    }

    // Execute deployment script
    if (process.env.NODE_ENV === 'production') {
      const { stdout, stderr } = await execAsync('/usr/local/bin/kamhub-update');
      
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

  } catch (error: unknown) {
    return NextResponse.json(
      { 
        error: 'Deployment failed',
        message: safeMsg(error) 
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
