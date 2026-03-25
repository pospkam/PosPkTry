import { z } from 'zod';
import { callAIWithModel } from '@/lib/ai/providers';
import { query } from '@/lib/database';
import type { ChatMessage } from '@/lib/ai/prompts';
import { getModelForAgent } from '@/lib/ai/agent-models';

export interface LeadContext {
  leadId?: string;
  limit?: number;
}

export interface LeadData {
  id: string;
  name: string;
  phone: string;
  comment?: string;
  source_data?: { source?: string; [key: string]: unknown };
  status: string;
}

export class LeadAgency {
  async qualifyLeads(ctx: LeadContext) {
    const limit = ctx.limit ?? 10;
    const res = await query(
      `SELECT id, name, phone, comment, source_data, status
       FROM leads WHERE status = 'new' LIMIT $1`,
      [limit]
    );

    const leads = res.rows as unknown as LeadData[];
    if (!leads.length) {
      return { analyzed: 0, qualified: 0, details: 'Нет новых лидов' };
    }

    const prompt = `
Проанализируй эти лиды туристических туров и определи качество каждого.
Выдай оценку от 1-10 и тип путешествия (fishing, trekking, thermal, boat_trip, helicopter).

Лиды:
${leads.map(l => `- ${l.name} (${l.phone}): "${l.comment || ''}"`).join('\n')}

Ответь в JSON формате:
{
  "analysis": [
    { "name": "имя", "score": 8, "intent": "fishing", "reason": "..." }
  ],
  "recommendation": "контактировать top-3 высокого качества"
}
    `;

    const { text: response } = await callAIWithModel([{ role: 'user', content: prompt }] as ChatMessage[], getModelForAgent('legal'));

    try {
      const parsed = JSON.parse(response);
      const qualified = (parsed.analysis || []).filter((a: any) => a.score >= 7);

      // Обновим статусы в БД
      for (const item of qualified) {
        const lead = leads.find(l => l.name === item.name);
        if (lead) {
          await query(
            `UPDATE leads SET status = 'qualified', notes = $1 WHERE id = $2`,
            [
              `Квалификация: ${item.score}/10, интерес к ${item.intent}`,
              lead.id,
            ]
          );
        }
      }

      return {
        analyzed: leads.length,
        qualified: qualified.length,
        details: parsed.recommendation,
      };
    } catch {
      return {
        analyzed: leads.length,
        qualified: 0,
        details: 'Ошибка парсинга AI ответа',
      };
    }
  }

  async suggestTours(leadId: string) {
    const res = await query(
      `SELECT id, comment, source_data FROM leads WHERE id = $1`,
      [leadId]
    );

    const rows = res.rows as unknown as LeadData[];
    if (!rows.length) {
      return { success: false, error: 'Лид не найден' };
    }

    const leadData = rows[0];
    const sourceInfo = leadData.source_data as { source?: string } | undefined;
    const prompt = `
Туристу интересно: "${leadData.comment || 'неизвестно'}"
Источник: ${sourceInfo?.source || 'неизвестно'}

Рекомендуй топ-3 тура с объяснением почему каждый подходит.
Ответь JSON: { "tours": [{ "type": "fishing|trekking|...", "reason": "..." }] }
    `;

    const { text: response } = await callAIWithModel([{ role: 'user', content: prompt }] as ChatMessage[], getModelForAgent('legal'));
    try {
      const parsed = JSON.parse(response);
      return { success: true, suggestions: parsed.tours };
    } catch {
      return { success: false, error: 'Ошибка analysys' };
    }
  }
}
