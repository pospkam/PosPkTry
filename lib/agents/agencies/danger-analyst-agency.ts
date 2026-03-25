/**
 * Danger Analyst Agency — AI Аналитик Опасностей Камчатки
 *
 * Архитектурная роль: "сейсмолог + метеоролог + тактик"
 * — принимает сырые данные (сейсмика, вулканы, погода, туристы)
 * — выдаёт структурированную оценку риска по зонам
 * — AI Спасатель ЧИТАЕТ эту оценку перед принятием решений
 *
 * Зоны Камчатки:
 *   avachinsky — Авачинско-Петропавловский кластер
 *   northern   — Северная Камчатка (Шивелуч, Ключевская группа)
 *   eastern    — Восточное побережье (Карымский, Кроноцкий)
 *   western    — Западное побережье
 */

import { query } from '@/lib/database';
import { callAIWithModel } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { getModelForAgent } from '@/lib/ai/agent-models';

// ── Константы ─────────────────────────────────────────────────────────────

const ZONES = ['avachinsky', 'northern', 'eastern', 'western'] as const;
type Zone = typeof ZONES[number];

const ZONE_NAMES: Record<Zone, string> = {
  avachinsky: 'Авачинско-Петропавловский район',
  northern:   'Северная Камчатка',
  eastern:    'Восточное побережье',
  western:    'Западное побережье',
};

// Вулканы зоны
const ZONE_VOLCANOES: Record<Zone, string[]> = {
  avachinsky: ['Авачинский', 'Корякский', 'Мутновский', 'Горелый', 'Вилючинский'],
  northern:   ['Шивелуч', 'Ключевской', 'Безымянный', 'Толбачик', 'Камень'],
  eastern:    ['Карымский', 'Кроноцкий', 'Узон', 'Малый Семячик', 'Жупановский'],
  western:    ['Ичинский'],
};

// Риск-порог для оповещения (0-100)
const RISK_THRESHOLDS = {
  low:      [0,  30],
  moderate: [30, 55],
  high:     [55, 75],
  critical: [75, 100],
} as const;

// ── Контекст для аналитика ────────────────────────────────────────────────

interface ZoneRawData {
  zone: Zone;
  seismic_events: Array<{
    title: string;
    description: string;
    magnitude?: number;
    published_at: string;
    severity: number;
  }>;
  volcanic_alerts: Array<{
    title: string;
    description: string;
    ash_height?: number;
    published_at: string;
    severity: number;
  }>;
  tourists_in_zone: number;
  active_tours: number;
  high_risk_routes: number;
}

interface ZoneAssessment {
  zone: Zone;
  risk_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  threat_types: string[];
  tourists_at_risk: number;
  active_tours_count: number;
  confidence: number;
  similar_event: string | null;
  recommended_action: string;
  analysis_text: string;
  max_magnitude: number | null;
  max_ash_height_m: number | null;
  seismic_events_count: number;
  volcanic_alerts_count: number;
}

// ── Загрузка данных по зоне ───────────────────────────────────────────────

async function loadZoneData(zone: Zone): Promise<ZoneRawData> {
  const [alertsRes, touristsRes] = await Promise.all([
    // Активные алерты по зоне (последние 48ч)
    query<{
      alert_type: string; title: string; description: string;
      severity: number; created_at: string; source_url: string;
    }>(
      `SELECT alert_type, title, description, severity, created_at, COALESCE(source_url, '') as source_url
       FROM external_alerts
       WHERE $1 = ANY(affected_zones)
         AND expires_at > NOW()
         AND created_at > NOW() - INTERVAL '48 hours'
       ORDER BY severity DESC, created_at DESC
       LIMIT 20`,
      [zone]
    ),
    // Туристы и туры в зоне
    query<{ tourists: string; tours: string; high_risk: string }>(
      `SELECT
         COALESCE(SUM(lrs.tourists_today), 0)::text AS tourists,
         COUNT(DISTINCT lrs.agent_route_id)::text AS tours,
         COUNT(CASE WHEN lrs.recommender_status IN ('red','yellow') THEN 1 END)::text AS high_risk
       FROM location_real_time_status lrs
       JOIN agent_route_knowledge ark ON ark.id = lrs.agent_route_id
       WHERE ark.zone = $1`,
      [zone]
    ),
  ]);

  const alerts = alertsRes.rows;
  const seismic = alerts.filter(a =>
    ['earthquake', 'seismic_bulletin'].includes(a.alert_type)
  ).map(a => ({
    title: a.title,
    description: a.description.slice(0, 300),
    magnitude: extractMagnitude(a.title),
    published_at: a.created_at,
    severity: a.severity,
  }));

  const volcanic = alerts.filter(a =>
    ['volcanic_eruption', 'ash_cloud'].includes(a.alert_type)
  ).map(a => ({
    title: a.title,
    description: a.description.slice(0, 300),
    ash_height: extractAshHeight(a.title),
    published_at: a.created_at,
    severity: a.severity,
  }));

  const tourist_row = touristsRes.rows[0];

  return {
    zone,
    seismic_events: seismic,
    volcanic_alerts: volcanic,
    tourists_in_zone: parseInt(tourist_row?.tourists ?? '0'),
    active_tours: parseInt(tourist_row?.tours ?? '0'),
    high_risk_routes: parseInt(tourist_row?.high_risk ?? '0'),
  };
}

function extractMagnitude(title: string): number | undefined {
  const m = title.match(/ML?\s*[=]?\s*(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : undefined;
}

function extractAshHeight(title: string): number | undefined {
  const m = title.match(/(\d+\.?\d*)\s*км/);
  if (m) return Math.round(parseFloat(m[1]) * 1000);
  const m2 = title.match(/(\d[\d\s]+)\s*м/);
  return m2 ? parseInt(m2[1].replace(/\s/g, '')) : undefined;
}

// ── Быстрый расчёт риска (до AI) ─────────────────────────────────────────

function quickRiskScore(data: ZoneRawData): number {
  let score = 0;

  // Сейсмика
  for (const eq of data.seismic_events) {
    const mag = eq.magnitude ?? 0;
    score += mag >= 7 ? 40 : mag >= 6 ? 25 : mag >= 5 ? 15 : mag >= 4 ? 8 : 3;
  }

  // Вулканы
  for (const v of data.volcanic_alerts) {
    const h = v.ash_height ?? 0;
    score += h >= 10000 ? 50 : h >= 7000 ? 35 : h >= 4000 ? 20 : 15;
  }

  // Туристы умножают риск
  if (data.tourists_in_zone > 100) score += 15;
  else if (data.tourists_in_zone > 50) score += 10;
  else if (data.tourists_in_zone > 10) score += 5;

  return Math.min(score, 100);
}

function riskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

function recommendedAction(level: 'low' | 'moderate' | 'high' | 'critical'): string {
  return {
    low:      'NORMAL',
    moderate: 'WATCH',
    high:     'EVACUATE_PRIORITY_2',
    critical: 'EVACUATE_IMMEDIATE',
  }[level];
}

// ── AI-анализ зоны ────────────────────────────────────────────────────────

async function analyzeZoneWithAI(data: ZoneRawData, quickScore: number): Promise<string> {
  const hasEvents = data.seismic_events.length > 0 || data.volcanic_alerts.length > 0;
  if (!hasEvents) {
    return `Зона "${ZONE_NAMES[data.zone]}": сейсмическая и вулканическая обстановка спокойная. ` +
      `Активных алертов нет. В зоне находится ${data.tourists_in_zone} туристов (${data.active_tours} активных маршрутов). ` +
      `Угрозы не выявлено, рекомендуется штатный режим работы.`;
  }

  const volcanosList = ZONE_VOLCANOES[data.zone].join(', ');
  const seismicSummary = data.seismic_events.length > 0
    ? data.seismic_events.slice(0, 3).map(e => `— ${e.title} (${new Date(e.published_at).toLocaleDateString('ru-RU')})`).join('\n')
    : 'нет';
  const volcanicSummary = data.volcanic_alerts.length > 0
    ? data.volcanic_alerts.slice(0, 3).map(v => `— ${v.title}`).join('\n')
    : 'нет';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'Ты — аналитик угроз камчатского МЧС. Пиши точно, лаконично, на русском. Без заголовков и воды.',
    },
    {
      role: 'user',
      content:
        `Проанализируй обстановку в зоне и напиши заключение (3-5 предложений) для оперативного штаба.\n\n` +
        `ЗОНА: ${ZONE_NAMES[data.zone]}\n` +
        `ОСНОВНЫЕ ВУЛКАНЫ: ${volcanosList}\n` +
        `ТУРИСТЫ В ЗОНЕ: ${data.tourists_in_zone} чел. / ${data.active_tours} маршрутов / ${data.high_risk_routes} с алертами\n\n` +
        `СЕЙСМИЧЕСКИЕ СОБЫТИЯ (48ч):\n${seismicSummary}\n\n` +
        `ВУЛКАНИЧЕСКАЯ АКТИВНОСТЬ (48ч):\n${volcanicSummary}\n\n` +
        `ПРЕДВАРИТЕЛЬНАЯ ОЦЕНКА РИСКА: ${quickScore}/100\n\n` +
        `Укажи: характер угрозы, риск для туристов, приоритетность реагирования.`,
    },
  ];

  const { text } = await callAIWithModel(messages, getModelForAgent('rescue'));
  return text;
}

// ── Сохранение оценки в БД ────────────────────────────────────────────────

async function saveAssessment(assessment: ZoneAssessment): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2); // Оценка актуальна 2 часа

  await query(
    `INSERT INTO danger_assessments (
      zone, assessed_at, expires_at,
      risk_score, risk_level, threat_types,
      tourists_at_risk, active_tours_count,
      confidence, similar_event, recommended_action, analysis_text,
      seismic_events_count, volcanic_alerts_count,
      max_magnitude, max_ash_height_m
    ) VALUES ($1,NOW(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      assessment.zone,
      expiresAt,
      assessment.risk_score,
      assessment.risk_level,
      assessment.threat_types,
      assessment.tourists_at_risk,
      assessment.active_tours_count,
      assessment.confidence,
      assessment.similar_event,
      assessment.recommended_action,
      assessment.analysis_text,
      assessment.seismic_events_count,
      assessment.volcanic_alerts_count,
      assessment.max_magnitude,
      assessment.max_ash_height_m,
    ]
  );
}

// ── Главная функция — полный анализ всех зон ─────────────────────────────

export async function runDangerAnalysis(): Promise<{
  assessments: ZoneAssessment[];
  high_risk_zones: Zone[];
  total_tourists_at_risk: number;
  errors: string[];
}> {
  const assessments: ZoneAssessment[] = [];
  const errors: string[] = [];

  for (const zone of ZONES) {
    try {
      const data = await loadZoneData(zone);
      const quickScore = quickRiskScore(data);
      const level = riskLevel(quickScore);

      // AI-анализ для зон с ненулевым риском
      let analysisText: string;
      try {
        analysisText = await analyzeZoneWithAI(data, quickScore);
      } catch {
        analysisText = `Зона ${ZONE_NAMES[zone]}: автоматическая оценка риска ${quickScore}/100.`;
      }

      const threatTypes: string[] = [];
      if (data.seismic_events.length > 0) threatTypes.push('seismic');
      if (data.volcanic_alerts.length > 0) threatTypes.push('volcanic');
      if (data.high_risk_routes > 0)       threatTypes.push('capacity');

      const maxMag = data.seismic_events.reduce<number | null>((m, e) =>
        e.magnitude ? Math.max(m ?? 0, e.magnitude) : m, null);
      const maxAsh = data.volcanic_alerts.reduce<number | null>((m, v) =>
        v.ash_height ? Math.max(m ?? 0, v.ash_height) : m, null);

      const assessment: ZoneAssessment = {
        zone,
        risk_score: quickScore,
        risk_level: level,
        threat_types: threatTypes,
        tourists_at_risk: level === 'low' ? 0 : data.tourists_in_zone,
        active_tours_count: data.active_tours,
        confidence: data.seismic_events.length > 0 || data.volcanic_alerts.length > 0 ? 0.85 : 0.60,
        similar_event: null,
        recommended_action: recommendedAction(level),
        analysis_text: analysisText,
        max_magnitude: maxMag,
        max_ash_height_m: maxAsh,
        seismic_events_count: data.seismic_events.length,
        volcanic_alerts_count: data.volcanic_alerts.length,
      };

      await saveAssessment(assessment);
      assessments.push(assessment);
    } catch (e) {
      errors.push(`Zone ${zone}: ${(e as Error).message}`);
    }
  }

  const highRiskZones = assessments
    .filter(a => a.risk_level === 'high' || a.risk_level === 'critical')
    .map(a => a.zone);

  const totalAtRisk = assessments.reduce((s, a) => s + a.tourists_at_risk, 0);

  return { assessments, high_risk_zones: highRiskZones, total_tourists_at_risk: totalAtRisk, errors };
}

// ── Получить актуальную оценку для конкретной зоны ───────────────────────

export async function getZoneAssessment(zone: Zone): Promise<ZoneAssessment | null> {
  const result = await query<ZoneAssessment>(
    `SELECT * FROM v_current_danger WHERE zone = $1 LIMIT 1`,
    [zone]
  );
  return result.rows[0] ?? null;
}

// ── Получить сводку по всем зонам (для AI Спасателя) ─────────────────────

export async function getFullDangerSummary(): Promise<string> {
  const result = await query<{
    zone: string; risk_score: number; risk_level: string;
    tourists_at_risk: number; recommended_action: string;
    analysis_text: string; assessed_at: string;
  }>(`SELECT zone, risk_score, risk_level, tourists_at_risk,
             recommended_action, analysis_text, assessed_at
      FROM v_current_danger
      ORDER BY risk_score DESC`);

  if (result.rows.length === 0) {
    return 'Оценки опасности по зонам ещё не сформированы. Запустите анализ.';
  }

  const lines = result.rows.map(r =>
    `[${r.zone.toUpperCase()} | Риск: ${r.risk_score}/100 | ${r.risk_level.toUpperCase()}] ` +
    `Туристов под угрозой: ${r.tourists_at_risk}. Действие: ${r.recommended_action}.\n` +
    `${r.analysis_text}`
  );

  return `ОЦЕНКА УГРОЗ ПО ЗОНАМ КАМЧАТКИ (${new Date().toLocaleString('ru-RU')}):\n\n` +
    lines.join('\n\n');
}
