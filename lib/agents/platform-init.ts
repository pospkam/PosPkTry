/**
 * Agent Platform Initialization
 *
 * Initialize agent scheduler, event bus, and other services on app startup.
 * Call this once from middleware or app entry point.
 */

import { initializeScheduler, shutdownScheduler } from '@/lib/agents/scheduler';
import { getEventBus } from '@/lib/events/agent-bus';
import { registerEventSubscribers } from '@/lib/events/subscribers';
import { seedAgentTraining } from '@/lib/agents/training/seed-training';

let initialized = false;

/**
 * Initialize all agent services
 */
export async function initializeAgentPlatform(): Promise<void> {
  if (initialized) return;

  // Initialize event bus (singleton) and register subscribers
  getEventBus();
  registerEventSubscribers();

  // Initialize scheduler (will start interval timers)
  await initializeScheduler();

  // Seed domain knowledge for all 13 agents (fire-and-forget, non-blocking)
  seedAgentTraining().catch(() => { /* non-critical */ });

  initialized = true;
}

/**
 * Shutdown all agent services (for graceful termination)
 */
export async function shutdownAgentPlatform(): Promise<void> {
  if (!initialized) return;

  try {
    await shutdownScheduler();
    initialized = false;
  } catch {
    // non-critical
  }
}

/**
 * Check if platform is initialized
 */
export function isAgentPlatformInitialized(): boolean {
  return initialized;
}
