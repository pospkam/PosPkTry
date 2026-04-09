/**
 * lib/legal/ai-legal-review.ts
 *
 * AI Legal слой для анализа юридических документов
 * Использует AI Legal агента для:
 * - Проверки на compliance риски
 * - Анализа потенциальных судебных исков
 * - Рекомендаций по улучшению формулировок
 * - Мониторинга изменений законодательства
 */

import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface LegalReview {
  document_type: string;
  version: number;
  reviewed_at: string;

  compliance_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';

  findings: LegalFinding[];
  recommendations: string[];

  jurisdictions_covered: string[];
  potential_liabilities: string[];
}

export interface LegalFinding {
  severity: 'info' | 'warning' | 'danger';
  clause: string;
  issue: string;
  impact: string;
  suggestion: string;
}

// AI Legal промпт
function buildLegalReviewPrompt(
  documentType: string,
  content: string,
  jurisdiction: string
): string {
  return `Ты — опытный юрист специализирующийся на туристическом праве, интернет-праве и защите потребителей.

Проанализируй следующий ЛЕГАЛЬНЫЙ ДОКУМЕНТ на наличие юридических рисков, проблем с compliance и потенциальных судебных исков.

ДОКУМЕНТ: ${documentType}
ЮРИСДИКЦИЯ: ${jurisdiction}

ТЕКСТ ДОКУМЕНТА:
${content}

АНАЛИЗИРУЙ следующие:

1. **СООТВЕТСТВИЕ ЗАКОНОДАТЕЛЬСТВУ:**
   - ФЗ "О защите потребителей"
   - ФЗ "О защите персональных данных" (GDPR эквивалент)
   - ФЗ "Об информации, информационных технологиях и защите информации"
   - Международное право (если применимо)

2. **ПОТЕНЦИАЛЬНЫЕ СУДЕБНЫЕ РИСКИ:**
   - Неоднозначные формулировки которые могут интерпретироваться против компании
   - Ограничения ответственности которые могут быть опровергнуты судом
   - Скрытые пункты которые потребители могут не заметить

3. **ЗАЩИТА КОМПАНИИ:**
   - Адекватность ограничения ответственности
   - Достаточность дисклеймеров
   - Соответствие требованиям к информированию

4. **ОПАСНЫЕ ФОРМУЛИРОВКИ:**
   - Кандидаты на отмену судом как "несправедливые условия"
   - Пункты которые могут быть квалифицированы как обман
   - Нарушение принципа добросовестности

5. **ПАРСИНГ И КОНТЕНТ:**
   - Если это документ про контент: адекватна ли лицензия?
   - Защита авторских прав третьих лиц
   - Согласие на использование персональных данных

ВЫВЕДИ в формате JSON:

{
  "compliance_score": <0-100>,
  "risk_level": "<low|medium|high|critical>",
  "findings": [
    {
      "severity": "<info|warning|danger>",
      "clause": "номер/название клаузулы",
      "issue": "что не так",
      "impact": "чем это опасно",
      "suggestion": "как исправить"
    }
  ],
  "recommendations": ["рекомендация 1", "рекомендация 2"],
  "potential_liabilities": ["вероятный иск 1", "вероятный иск 2"],
  "jurisdictions_covered": ["RU", "EU", "International"]
}

Будь критичен и предполагай худшее — твоя работа защитить компанию от судебных исков.
  `;
}

// Основной анализ
export async function reviewLegalDocument(
  documentType: string,
  content: string,
  jurisdiction: string = 'Russian Federation'
): Promise<LegalReview> {
  try {
    const prompt = buildLegalReviewPrompt(documentType, content, jurisdiction);

    const aiResponse = await callAIWithModelDirect([
      { role: 'user', content: prompt } as ChatMessage,
    ], getModelForAgent('legal'));

    // Парсить JSON из ответа
    const jsonMatch = aiResponse?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI Legal не вернул валидный JSON');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      document_type: documentType,
      version: 1,
      reviewed_at: new Date().toISOString(),
      compliance_score: analysis.compliance_score || 60,
      risk_level: analysis.risk_level || 'high',
      findings: analysis.findings || [],
      recommendations: analysis.recommendations || [],
      jurisdictions_covered: analysis.jurisdictions_covered || ['RU'],
      potential_liabilities: analysis.potential_liabilities || [],
    };
  } catch (err) {
    console.error('[AI Legal] Review failed:', err);
    throw new Error(`AI Legal анализ не прошёл: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Мониторинг изменений в document
export async function detectLegalChanges(
  oldVersion: string,
  newVersion: string
): Promise<string[]> {
  const prompt = `Ты — юридический консультант.

СТАРАЯ ВЕРСИЯ:
${oldVersion}

НОВАЯ ВЕРСИЯ:
${newVersion}

Определи ЗНАЧИТЕЛЬНЫЕ ЮРИДИЧЕСКИЕ ИЗМЕНЕНИЯ:
- Изменение условий ответственности
- Изменение в защите персональных данных
- Изменение условий использования контента
- Изменение в условиях возврата/отмены
- Любые изменения которые могут повлиять на пользователей/операторов

Выведи список изменений одно на строку. Будь краток.
  `;

  try {
    const response = await callAIWithModelDirect([
      { role: 'user', content: prompt } as ChatMessage,
    ], getModelForAgent('legal'));

    return response?.split('\n').filter(line => line.trim().length > 0) || [];
  } catch (err) {
    console.error('[AI Legal] Change detection failed:', err);
    return [];
  }
}

// Compliance score интерпретация
export function explainComplianceScore(score: number): {
  status_icon: string;
  status: string;
  action: string;
} {
  if (score >= 90) {
    return {
      status_icon: '[OK]',
      status: 'Документ полностью compliant',
      action: 'Можно публиковать'
    };
  }
  if (score >= 75) {
    return {
      status_icon: '[!]',
      status: 'Документ largely compliant, но есть замечания',
      action: 'Рекомендуется внести изменения'
    };
  }
  if (score >= 50) {
    return {
      status_icon: '[!!]',
      status: 'Значительные compliance проблемы',
      action: 'Обязательно пересмотреть перед публикацией'
    };
  }
  return {
    status_icon: '[CRITICAL]',
    status: 'Критичные compliance нарушения',
    action: 'НЕЛЬЗЯ ИСПОЛЬЗОВАТЬ до полной переработки'
  };
}
