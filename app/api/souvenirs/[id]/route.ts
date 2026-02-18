import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await query(
      'SELECT * FROM souvenirs WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Сувенир не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const souvenir = {
      ...result.rows[0],
      price: parseFloat(result.rows[0].price),
      images: JSON.parse(result.rows[0].images || '[]'),
      tags: JSON.parse(result.rows[0].tags || '[]')
    };

    return NextResponse.json({
      success: true,
      data: { souvenir }
    } as ApiResponse<any>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    await query(`
      UPDATE souvenirs 
      SET name = $1, description = $2, price = $3, updated_at = NOW()
      WHERE id = $4
    `, [body.name, body.description, body.price, params.id]);

    return NextResponse.json({
      success: true,
      message: 'Обновлено'
    } as ApiResponse<any>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await query('UPDATE souvenirs SET is_active = false WHERE id = $1', [params.id]);
    return NextResponse.json({
      success: true,
      message: 'Удалено'
    } as ApiResponse<any>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

