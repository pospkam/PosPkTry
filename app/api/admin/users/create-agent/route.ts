/**
 * POST /api/admin/users/create-agent
 * Create new agent user (admin only)
 *
 * Used for onboarding agents without going through public registration
 * Generates temporary password, sends via email (manual for now)
 *
 * Auth: admin role required
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';

const CreateAgentSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1).max(255),
  temporary_password: z.string().min(8).max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authOrResponse = await requireAdmin(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const body = await request.json();
    const parsed = CreateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { email, name, temporary_password } = parsed.data;

    // Check if user exists
    const existingResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate temporary password if not provided
    const tempPassword = temporary_password || Math.random().toString(36).slice(-12);
    const hashedPassword = await hashPassword(tempPassword);

    // Create agent user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, preferences, pd_consent_at, pd_consent_ip, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), $6, NOW(), NOW())
       RETURNING id, email, name, role, created_at`,
      [
        email.toLowerCase(),
        hashedPassword,
        name,
        'agent',
        JSON.stringify({ roles: ['agent'] }),
        '127.0.0.1', // Admin-created user
      ]
    );

    const user = result.rows[0];

    // TODO: Send email with temporary password (integrate email service)
    // For now, return password in response (must be logged securely)

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          created_at: user.created_at,
          temporary_password: tempPassword, // 🔒 Must be saved securely by admin
          login_url: '/auth/signin',
        },
        message: 'Agent user created. Send temporary password to user securely.',
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create agent user' },
      { status: 500 }
    );
  }
}
