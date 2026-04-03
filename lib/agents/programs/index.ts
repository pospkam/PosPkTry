/**
 * Agent Program Loader
 *
 * Reads .md program files for each board director.
 * These externalized programs allow editing agent behavior
 * without touching TypeScript code (Karpathy autoresearch pattern).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROGRAMS_DIR = join(process.cwd(), 'lib', 'agents', 'programs');

const cache = new Map<string, string>();

/**
 * Load an agent's .md program file content.
 * Returns the raw markdown text, cached after first read.
 * Returns null if no program file exists for the agent.
 */
export function loadAgentProgram(agentId: string): string | null {
  if (cache.has(agentId)) return cache.get(agentId)!;

  const filePath = join(PROGRAMS_DIR, `${agentId}.md`);
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    cache.set(agentId, content);
    return content;
  } catch {
    return null;
  }
}

/**
 * Build an enhanced persona string by merging the hardcoded persona
 * with the externalized .md program (if it exists).
 * The .md content is prepended as additional context.
 */
export function buildEnhancedPersona(agentId: string, basePersona: string): string {
  const program = loadAgentProgram(agentId);
  if (!program) return basePersona;

  return `${program}\n\n---\nОперационная инструкция:\n${basePersona}`;
}

/**
 * Clear the program cache (useful for hot-reload in dev).
 */
export function clearProgramCache(): void {
  cache.clear();
}
