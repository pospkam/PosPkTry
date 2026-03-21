/**
 * AI Agent Permission Model
 * Defines which intents each role can call.
 */

export type AgentRole = 'admin' | 'operator' | 'guide' | 'tourist' | 'anonymous';

/** Intents each role can dispatch */
const ROLE_INTENTS: Record<AgentRole, string[]> = {
  admin: ['*'], // admin can call anything

  operator: [
    'op_tours_summary',
    'op_bookings_today',
    'op_revenue',
    'op_create_tour',
    'op_fill_ai',
    'op_add_slots',
  ],

  guide: [
    'rescue_sos_stats',
    'rescue_weather_risk',
    'rescue_protocols',
  ],

  tourist: [
    'tourist_recommend',
  ],

  anonymous: [],
};

export function canDispatchIntent(role: string | undefined | null, intent: string): boolean {
  const r = (role ?? 'anonymous') as AgentRole;
  const allowed = ROLE_INTENTS[r] ?? [];
  return allowed.includes('*') || allowed.includes(intent);
}

export function allowedIntentsForRole(role: string): string[] {
  const r = (role ?? 'anonymous') as AgentRole;
  return ROLE_INTENTS[r] ?? [];
}
