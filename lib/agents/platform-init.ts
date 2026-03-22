/**
 * Agent Platform Initialization
 *
 * Initialize agent scheduler, event bus, and other services on app startup.
 * Call this once from middleware or app entry point.
 */

import { initializeScheduler, shutdownScheduler } from '@/lib/agents/scheduler';
import { getEventBus } from '@/lib/events/agent-bus';

let initialized = false;

/**
 * Initialize all agent services
 */
export async function initializeAgentPlatform(): Promise<void> {
  if (initialized) return;

  try {
    console.log('[AgentPlatform] Initializing...');

    // Initialize event bus (singleton)
    const eventBus = getEventBus();
    console.log('[AgentPlatform] Event bus ready');

    // Initialize scheduler (will start interval timers)
    await initializeScheduler();
    console.log('[AgentPlatform] Scheduler started');

    initialized = true;
    console.log('[AgentPlatform] Initialization complete');
  } catch (err) {
    console.error('[AgentPlatform] Initialization failed:', err);
    throw err;
  }
}

/**
 * Shutdown all agent services (for graceful termination)
 */
export async function shutdownAgentPlatform(): Promise<void> {
  if (!initialized) return;

  try {
    console.log('[AgentPlatform] Shutting down...');
    await shutdownScheduler();
    initialized = false;
    console.log('[AgentPlatform] Shutdown complete');
  } catch (err) {
    console.error('[AgentPlatform] Shutdown error:', err);
  }
}

/**
 * Check if platform is initialized
 */
export function isAgentPlatformInitialized(): boolean {
  return initialized;
}
