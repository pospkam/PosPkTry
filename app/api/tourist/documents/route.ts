import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile, validateDocumentData } from '@/lib/auth/tourist-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/documents - Get tourist documents
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type');

    let queryText = `SELECT * FROM tourist_documents WHERE tourist_id = $1`;
    const params: any[] = [profile.id];

    if (documentType) {
      queryText += ` AND document_type = $2`;
      params.push(documentType);
    }

    queryText += ` ORDER BY expiry_date ASC NULLS LAST, created_at DESC`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении документов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/tourist/documents - Add new document
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      documentType,
      documentNumber,
      issuingCountry,
      issuingAuthority,
      issueDate,
      expiryDate,
      fileUrl,
      fileName,
      fileSize,
      notes
    } = body;

    const validation = validateDocumentData({
      documentType,
      documentNumber,
      issueDate,
      expiryDate
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO tourist_documents (
        tourist_id, document_type, document_number, issuing_country, issuing_authority,
        issue_date, expiry_date, file_url, file_name, file_size, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        profile.id, documentType, documentNumber || null, issuingCountry || null, issuingAuthority || null,
        issueDate || null, expiryDate || null, fileUrl || null, fileName || null, fileSize || null, notes || null
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error adding document:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при добавлении документа' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
