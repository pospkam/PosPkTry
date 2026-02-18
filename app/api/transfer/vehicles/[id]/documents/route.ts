import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyVehicleOwnership } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/vehicles/[id]/documents
 * Get vehicle documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const isOwner = await verifyVehicleOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const result = await query(
      `SELECT * FROM vehicle_documents 
       WHERE vehicle_id = $1 
       ORDER BY expiry_date ASC NULLS LAST`,
      [params.id]
    );

    const documents = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      fileUrl: row.file_url,
      documentNumber: row.document_number,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      issuingAuthority: row.issuing_authority,
      status: row.status,
      notes: row.notes,
      uploadedAt: row.uploaded_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { documents }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get vehicle documents error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении документов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer/vehicles/[id]/documents
 * Add vehicle document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const isOwner = await verifyVehicleOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const {
      type,
      name,
      fileUrl,
      documentNumber,
      issueDate,
      expiryDate,
      issuingAuthority,
      notes
    } = body;

    if (!type || !name || !fileUrl) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля: тип, название, файл'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `INSERT INTO vehicle_documents (
        vehicle_id, type, name, file_url, document_number,
        issue_date, expiry_date, issuing_authority, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        params.id,
        type,
        name,
        fileUrl,
        documentNumber,
        issueDate,
        expiryDate,
        issuingAuthority,
        notes
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Документ успешно добавлен'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create vehicle document error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при добавлении документа'
    } as ApiResponse<null>, { status: 500 });
  }
}
