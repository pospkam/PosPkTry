/**
 * IntelligenceAgency — AI-разведчик конкурентного рынка.
 *
 * Мониторинг конкурентов и рыночных трендов:
 *   market_intelligence — анализ конкурентов + тренды 2026 + предложения экосистеме
 */

import { callAIWithModel } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

export class IntelligenceAgency {
  private briefing = '';
  private preferredModel: string | null = null;

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.preferredModel = context.preferredModel ?? null;
    switch (intent) {
      case 'market_intelligence': return this.marketAnalysis(context);
      default: return { response: 'IntelligenceAgency: команда не поддерживается.' };
    }
  }

  private async marketAnalysis(context: AgentContext): Promise<AgencyResult> {
    const externalSignals = (context.external_signals as Record<string, string> | undefined)?.['intelligence'] ?? '';

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Ты AI-разведчик туристической платформы KamchatourHub (Камчатка, Россия).

Твоя задача — анализировать конкурентный рынок и выявлять возможности для роста экосистемы.

Конкуренты для мониторинга:
- explore-kamchatka.ru — крупнейший агрегатор туров Камчатки
- kam.tours — местный туроператор
- kamchatkaland.ru — природные туры
- kamchatka.guide — путеводитель и туры
- Трипстер / Biletix / СберТревел — федеральные агрегаторы

Оценивай по 4 критериям:
1. GAP-анализ — что конкуренты предлагают, чего нет у нас?
2. Ценовое позиционирование — дешевле/дороже/в нише?
3. Технологические тренды — AI-рекомендации, персонализация, instant booking?
4. Новые форматы 2026 — экотуры, digital nomad packages, wellness, solo travel?

Правила: только факты из данных ниже. Если данных нет — пиши "нет данных по этому пункту".
Не придумывай конкурентов и их цены. Давай конкретные рекомендации для экосистемы.`,
      },
      {
        role: 'user',
        content: `Контекст платформы:\n${this.briefing || 'Туристическая AI-платформа Камчатки с 10 агентами, SAR, eco-мониторингом'}\n\nВнешние сигналы рынка:\n${externalSignals || 'Внешних сигналов нет — используй общие знания о рынке туризма России 2026 года.'}\n\nПодготовь разведывательный отчёт с 3-5 конкретными рекомендациями по развитию экосистемы.`,
      },
    ];

    const { text } = await callAIWithModel(messages, this.preferredModel);
    return { response: text };
  }
}
