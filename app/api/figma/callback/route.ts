import { NextRequest, NextResponse } from 'next/server';
import { figmaClient } from '@/lib/figma/figma-client';

/**
 * GET /api/figma/callback - OAuth callback от Figma
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/admin?figma_error=${error}`
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Обмениваем code на access token
    const accessToken = await figmaClient.authorize(code);

    // Сохраняем токен (TODO: сохранить в БД для админа)
    // В production нужно сохранить в secure storage

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/settings?figma_connected=true`
    );

  } catch (error) {
    console.error('Figma callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}/admin?figma_error=auth_failed`
    );
  }
}





























