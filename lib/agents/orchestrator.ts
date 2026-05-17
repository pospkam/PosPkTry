/**
 * Agent Orchestrator — параллельный запуск агентов Evo-системы.
 *
 * Запускает Growth, Rescue, Evolver Analysis параллельно (Promise.allSettled).
 * Evolution Loop остаётся последовательным — он пишет в БД и должен завершиться.
 * Итог: ~3x быстрее при том же timeout 120s.
 */

import { runGrowthScan } from '@/lib/agents/evo/growth-agent';
import { runEvolutionLoop } from '@/lib/agents/evo/evolution-loop';
import { runRescueScan } from '@/lib/agents/evo/rescue-agent';
import { runEvolverAnalysis } from '@/lib/agents/evo/evolver-analysis';

export interface OrchestratorResult {
  scan: unknown;
  evolution: unknown;
  rescue: unknown;
  evolver: unknown;
  duration_ms: number;
  errors: string[];
}

export async function runEvoOrchestrator(scanType = 'full'): Promise<OrchestratorResult> {
  const start = Date.now();
  const errors: string[] = [];

  // Phase 1: параллельно — диагностика + безопасность + анализ логов
  const [scanRes, rescueRes, evolverRes] = await Promise.allSettled([
    runGrowthScan(scanType),
    runRescueScan(),
    runEvolverAnalysis(),
  ]);

  // Phase 2: Evolution Loop — последовательно (применяет фиксы, пишет в БД)
  let evoResult: unknown = null;
  try {
    evoResult = await runEvolutionLoop();
  } catch (err) {
    errors.push(`Evolution: ${err instanceof Error ? err.message : String(err)}`);
  }

  function unwrap<T>(settled: PromiseSettledResult<T>, name: string): T | null {
    if (settled.status === 'fulfilled') return settled.value;
    errors.push(`${name}: ${settled.reason instanceof Error ? settled.reason.message : String(settled.reason)}`);
    return null;
  }

  return {
    scan: unwrap(scanRes, 'GrowthScan'),
    evolution: evoResult,
    rescue: unwrap(rescueRes, 'RescueScan'),
    evolver: unwrap(evolverRes, 'EvolverAnalysis'),
    duration_ms: Date.now() - start,
    errors,
  };
}
