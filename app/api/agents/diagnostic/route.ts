/**
 * GET /api/agents/diagnostic
 *
 * Comprehensive system health check for board meetings
 * Tests all tables, queries, and dependencies that agents need
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface TableCheck {
  name: string;
  exists: boolean;
  row_count?: number;
  error?: string;
}

interface AgencyDiagnostic {
  agency: string;
  critical_tables: TableCheck[];
  test_query_succeeded: boolean;
  error?: string;
}

export async function GET(req: NextRequest) {
  const authOrResponse = await requireAdmin(req);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const diagnostics = {
    timestamp: new Date().toISOString(),
    database_connected: false,
    agencies: {} as Record<string, AgencyDiagnostic>,
    critical_issues: [] as string[],
  };

  try {
    // Test basic connection
    await pool.query('SELECT 1');
    diagnostics.database_connected = true;
  } catch (err) {
    diagnostics.critical_issues.push(`❌ Database connection failed: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Define what each agency needs
  const agencyTableRequirements: Record<string, string[]> = {
    admin: ['leads', 'bookings', 'page_views', 'weather_alerts'],
    legal: ['user_agreements', 'operator_agreements'],
    security: ['ai_actions_log', 'users'],
    hacker: ['operator_bookings', 'operator_tours'],
    rescue: ['sos_events', 'page_views'],
    eco: ['eco_points', 'agent_route_knowledge'],
    content: ['reviews', 'operator_tours'],
    quality: ['operator_bookings', 'users'],
    evo: ['agent_experiments', 'agent_approvals'],
  };

  // Check each agency's tables
  for (const [agency, tables] of Object.entries(agencyTableRequirements)) {
    const tableChecks: TableCheck[] = [];
    let test_query_succeeded = false;
    let error: string | undefined;

    for (const table of tables) {
      const check: TableCheck = { name: table, exists: false };
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = $1`,
          [table]
        );
        const tableExists = result.rows[0]?.cnt === 1;
        check.exists = tableExists;

        if (tableExists) {
          try {
            const countResult = await pool.query(`SELECT COUNT(*)::int as cnt FROM ${table} LIMIT 1`);
            check.row_count = countResult.rows[0]?.cnt ?? 0;
            test_query_succeeded = true;
          } catch (e) {
            check.error = e instanceof Error ? e.message : 'Unknown error';
          }
        } else {
          check.exists = false;
        }
      } catch (e) {
        check.error = e instanceof Error ? e.message : 'Unknown error';
      }

      tableChecks.push(check);
    }

    const agencyDiag: AgencyDiagnostic = {
      agency,
      critical_tables: tableChecks,
      test_query_succeeded,
      error,
    };

    const missingTables = tableChecks.filter(t => !t.exists);
    if (missingTables.length > 0) {
      agencyDiag.error = `Missing tables: ${missingTables.map(t => t.name).join(', ')}`;
      diagnostics.critical_issues.push(`❌ ${agency} agency: ${agencyDiag.error}`);
    }

    diagnostics.agencies[agency] = agencyDiag;
  }

 return NextResponse.json(diagnostics);
}
