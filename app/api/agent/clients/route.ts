import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, AgentClient, ClientFormData } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/clients - Получить список клиентов агента
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'WHERE agent_id = $1';
    const params = [agentId];

    if (status !== 'all') {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR company ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    const clientsQuery = `
      SELECT
        id,
        name,
        email,
        phone,
        company,
        total_bookings,
        total_spent,
        last_booking,
        status,
        notes,
        tags,
        source,
        created_at,
        updated_at
      FROM agent_clients
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const clientsResult = await query(clientsQuery, params);

    const clients: AgentClient[] = clientsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      totalBookings: parseInt(row.total_bookings),
      totalSpent: parseFloat(row.total_spent),
      lastBooking: row.last_booking,
      status: row.status,
      notes: row.notes,
      tags: JSON.parse(row.tags || '[]'),
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        clients,
        total: clients.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching agent clients:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении списка клиентов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/agent/clients - Создать нового клиента
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const body: ClientFormData = await request.json();
    const { name, email, phone, company, status, notes, tags, source } = body;

    if (!name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Имя и email обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем, что клиент с таким email еще не существует у этого агента
    const existingClientQuery = `
      SELECT id FROM agent_clients
      WHERE agent_id = $1 AND email = $2
    `;

    const existingResult = await query(existingClientQuery, [agentId, email]);
    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Клиент с таким email уже существует'
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаем нового клиента
    const createClientQuery = `
      INSERT INTO agent_clients (
        id,
        agent_id,
        name,
        email,
        phone,
        company,
        total_bookings,
        total_spent,
        status,
        notes,
        tags,
        source,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      RETURNING id, created_at
    `;

    const clientResult = await query(createClientQuery, [
      agentId,
      name,
      email,
      phone || null,
      company || null,
      0, // total_bookings
      0, // total_spent
      status,
      notes || null,
      JSON.stringify(tags || []),
      source
    ]);

    const newClient = clientResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        clientId: newClient.id,
        createdAt: newClient.created_at
      },
      message: 'Клиент успешно создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating agent client:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании клиента'
    } as ApiResponse<null>, { status: 500 });
  }
}
