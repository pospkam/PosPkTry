/**
 * POST /api/planner/validate
 *
 * Real route validation using zone graph, activity constraints, and seasonal data.
 * Returns structured issues with severity levels.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ZONE_GRAPH,
  ACTIVITY_CONSTRAINTS,
  ZONE_ALLOWED_TRANSPORT,
} from '@/lib/services/trip-recommender';
import type { ZoneId } from '@/lib/services/trip-recommender';
import { SEASON_BLOCKED } from '@/lib/services/routes-recommender';

export const dynamic = 'force-dynamic';

const DaySchema = z.object({
  day:              z.number(),
  zone:             z.enum(['avachinsky', 'western', 'eastern', 'northern']),
  title:            z.string(),
  activityType:     z.string(),
  defaultTransport: z.string(),
});

const BodySchema = z.object({
  days:         z.array(DaySchema).min(2).max(21),
  arrivalDate:  z.string().date().optional(),
  fitnessLevel: z.enum(['beginner', 'moderate', 'active']).optional(),
  seasickness:  z.boolean().optional(),
  children:     z.array(z.number().min(0).max(17)).optional(),
});

interface ValidationIssue {
  type: string;
  severity: 'critical' | 'important' | 'info';
  message: string;
  day?: number;
}

const FITNESS_ORDER: Record<string, number> = {
  beginner: 0, moderate: 1, active: 2,
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { days, arrivalDate, fitnessLevel, seasickness, children } = parsed.data;
  const issues: ValidationIssue[] = [];

  // 1. Must have at least one activity
  const hasActivities = days.some(d => d.activityType && d.activityType !== 'rest');
  if (!hasActivities) {
    issues.push({
      type: 'no_activities',
      severity: 'critical',
      message: 'Добавьте хотя бы одну активность на маршрут.',
    });
  }

  // 2. Zone transitions — check if travel day is needed
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const curr = days[i];
    if (prev.zone !== curr.zone) {
      const edge = ZONE_GRAPH[prev.zone as ZoneId]?.[curr.zone as ZoneId];
      if (edge?.needsTravelDay) {
        // Check if there's a travel/rest day between these activity days
        const prevIsActive = prev.activityType && prev.activityType !== 'rest';
        const currIsActive = curr.activityType && curr.activityType !== 'rest';
        if (prevIsActive && currIsActive) {
          const hours = edge.travelHours ? `${edge.travelHours} ч` : 'вертолёт';
          issues.push({
            type: 'missing_travel_day',
            severity: 'important',
            message: `Между днями ${prev.day} и ${curr.day} нужен переезд (${prev.zone} -> ${curr.zone}, ${edge.distanceKm} км, ${hours}). Добавьте день переезда.`,
            day: curr.day,
          });
        }
      }
    }
  }

  // 3. Seasonal checks
  if (arrivalDate) {
    const arrMonth = new Date(arrivalDate).getMonth() + 1; // 1-12
    for (const d of days) {
      if (!d.activityType || d.activityType === 'rest') continue;

      // Check SEASON_BLOCKED
      const blocked = SEASON_BLOCKED[arrMonth] ?? [];
      if (blocked.includes(d.activityType)) {
        issues.push({
          type: 'seasonal_block',
          severity: 'critical',
          message: `${d.title} (день ${d.day}) недоступна в этом месяце.`,
          day: d.day,
        });
      }

      // Check ACTIVITY_CONSTRAINTS.months
      const constraint = ACTIVITY_CONSTRAINTS[d.activityType];
      if (constraint?.months && !constraint.months.includes(arrMonth)) {
        // Avoid duplicate if already caught by SEASON_BLOCKED
        const alreadyCaught = issues.some(
          iss => iss.day === d.day && iss.type === 'seasonal_block',
        );
        if (!alreadyCaught) {
          issues.push({
            type: 'out_of_season',
            severity: 'critical',
            message: `${d.title} (день ${d.day}): активность "${d.activityType}" рекомендована в другие месяцы.`,
            day: d.day,
          });
        }
      }
    }
  }

  // 4. Activity-zone compatibility
  for (const d of days) {
    if (!d.activityType || d.activityType === 'rest') continue;
    const constraint = ACTIVITY_CONSTRAINTS[d.activityType];
    if (constraint?.bestZones && !constraint.bestZones.includes(d.zone as ZoneId)) {
      issues.push({
        type: 'zone_mismatch',
        severity: 'info',
        message: `${d.title} (день ${d.day}): "${d.activityType}" лучше подходит для других зон.`,
        day: d.day,
      });
    }
  }

  // 5. Transport feasibility
  for (const d of days) {
    if (!d.defaultTransport || d.activityType === 'rest') continue;
    const allowed = ZONE_ALLOWED_TRANSPORT[d.zone as ZoneId];
    if (allowed && !allowed.includes(d.defaultTransport as 'walking' | 'jeep' | 'helicopter' | 'boat')) {
      issues.push({
        type: 'invalid_transport',
        severity: 'important',
        message: `День ${d.day}: транспорт "${d.defaultTransport}" недоступен в зоне "${d.zone}".`,
        day: d.day,
      });
    }
  }

  // 6. Child age constraints
  if (children && children.length > 0) {
    const minChildAge = Math.min(...children);
    for (const d of days) {
      if (!d.activityType || d.activityType === 'rest') continue;
      const constraint = ACTIVITY_CONSTRAINTS[d.activityType];
      if (constraint?.minChildAge && minChildAge < constraint.minChildAge) {
        issues.push({
          type: 'child_age',
          severity: 'important',
          message: `День ${d.day}: "${d.activityType}" рекомендуется детям от ${constraint.minChildAge} лет (ваш младший: ${minChildAge}).`,
          day: d.day,
        });
      }
    }
  }

  // 7. Fitness level check
  if (fitnessLevel) {
    const userFitness = FITNESS_ORDER[fitnessLevel] ?? 0;
    for (const d of days) {
      if (!d.activityType || d.activityType === 'rest') continue;
      const constraint = ACTIVITY_CONSTRAINTS[d.activityType];
      if (constraint?.fitnessRequired) {
        const reqFitness = FITNESS_ORDER[constraint.fitnessRequired] ?? 0;
        if (userFitness < reqFitness) {
          issues.push({
            type: 'fitness_mismatch',
            severity: 'info',
            message: `День ${d.day}: "${d.activityType}" требует уровень "${constraint.fitnessRequired}", ваш: "${fitnessLevel}".`,
            day: d.day,
          });
        }
      }
    }
  }

  // 8. Seasickness warning
  if (seasickness) {
    const seaActivities = new Set(['boat_trip', 'sea', 'fishing']);
    for (const d of days) {
      if (seaActivities.has(d.activityType)) {
        issues.push({
          type: 'seasickness',
          severity: 'info',
          message: `День ${d.day}: "${d.activityType}" связана с морем. При укачивании возьмите препараты.`,
          day: d.day,
        });
      }
    }
  }

  const hasCritical = issues.some(i => i.severity === 'critical');
  const valid = !hasCritical;

  let message: string;
  if (!valid) {
    const critCount = issues.filter(i => i.severity === 'critical').length;
    message = `Обнаружены проблемы (${critCount} критических). Исправьте их перед бронированием.`;
  } else if (issues.length > 0) {
    message = `Маршрут готов (${issues.length} рекомендаций). Выбирайте туры на каждый день.`;
  } else {
    message = 'Маршрут готов. Выбирайте туры на каждый день.';
  }

  return NextResponse.json({ success: true, valid, message, issues });
}
