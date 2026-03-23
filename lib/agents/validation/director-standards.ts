/**
 * lib/agents/validation/director-standards.ts
 *
 * Enforces AI Directors Training Manual standards:
 * - Factual accuracy (data-backed claims, no guessing)
 * - Zero hallucinations (no invented metrics)
 * - No sycophancy (honest analysis, not flattery)
 * - Reality checks (implementation feasibility)
 * - Transparency (show reasoning, acknowledge uncertainty)
 */

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * 7-point validation checklist from AI_DIRECTORS_TRAINING_MANUAL
 * Before recommending anything, answer these 7 questions:
 */
export function validateProposalAgainstChecklist(
  proposal: {
    title: string;
    description: string;
    action_type: string;
    priority: string;
  },
  agentId: string,
  agentReport?: string
): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // FLAG 1: Check for unverified metrics/claims
  const unverifiedPatterns = [
    /probably|likely|probably\s+(should|will|might)(?!\s+have)|apparently|seems like|I think|I believe/i,
    /users? (?:are|seem) (unhappy|upset|mad|angry)/i,
    /\bguess\b|\busually\b/i,
    /everyone |most |almost all |typically |generally /i,
    // Russian equivalents
    /вероятно|похоже|я думаю|я считаю|мне кажется|видимо|по всей видимости|скорее всего(?! по данным)/i,
    /пользователи (?:недовольны|злятся|расстроены|кажется)/i,
    /\bобычно\b|\bкак правило\b|\bвсе?\b(?! данные| результаты| участники)/i,
    /все операторы|большинство|почти все|как правило|в целом /i,
  ];

  for (const pattern of unverifiedPatterns) {
    if (pattern.test(proposal.description)) {
      violations.push(`Unverified claim detected: Use data, not guesses. Avoid "probably", "likely", "seems", "I think"`);
      break;
    }
  }

  // FLAG 2: Check for false urgency without justification
  const urgencyPatterns = [
    /must act immediately|act now|critical urgency|emergency|asap/i,
    // Russian equivalents
    /нужно действовать немедленно|действуйте сейчас|критическая срочность|срочно без обоснования/i,
  ];

  for (const pattern of urgencyPatterns) {
    if (pattern.test(proposal.description) && !proposal.description.toLowerCase().includes('will cause') &&
        !proposal.description.toLowerCase().includes('lead to') && !proposal.description.toLowerCase().includes('result in') &&
        !proposal.description.toLowerCase().includes('приведёт') && !proposal.description.toLowerCase().includes('вызовет') &&
        !proposal.description.toLowerCase().includes('следствием')) {
      warnings.push(`False urgency detected: Cite consequences. Why now vs later?`);
      break;
    }
  }

  // FLAG 3: Check for oversimplification
  const oversimplifPatterns = [
    /operators? (?:are) (?:unmotivated|lazy|incompetent)/i,
    /tourists? (?:don't|don't) understand|tourists? (?:are) dumb/i,
    /\ball \w+ (?:are|is)/i,  // "all X are..."
    // Russian equivalents
    /операторы (?:ленивые|некомпетентные|не хотят работать)/i,
    /туристы не понимают|туристы тупые|туристы не хотят/i,
    /все \w+ (?:являются|это)/i,  // "все X являются..."
  ];

  for (const pattern of oversimplifPatterns) {
    if (pattern.test(proposal.description)) {
      violations.push(`Oversimplification: Name specific cases, acknowledge complexity. Avoid blanket statements like "all X are Y"`);
      break;
    }
  }

  // FLAG 4: Check for agent bias (bias toward role's interests)
  const desc = proposal.description.toLowerCase();
  if (agentId === 'security' && (desc.includes('potential security risk') || desc.includes('потенциальный риск безопасности') || desc.includes('угроза безопасности'))) {
    warnings.push(`Potential Security agent bias: Quantify exploitability, don't just assume hypothetical threat`);
  }
  if (agentId === 'eco' && (desc.includes('tourism damages') || desc.includes('туризм наносит ущерб') || desc.includes('туризм повреждает'))) {
    warnings.push(`Potential Eco agent bias: Cite impact studies, don't assume activism is fact`);
  }
  if (agentId === 'rescue' && (desc.includes('need more resources') || desc.includes('нужны дополнительные ресурсы') || desc.includes('требуются ресурсы'))) {
    warnings.push(`Potential Rescue agent bias: Show incident trend data, don't just request resources`);
  }

  // FLAG 5: Check for hallucinated features
  const hallucinationPatterns = [
    /ai predicts|ai estimates(?!\s+with confidence bounds)/i,
    /didn't notice|wasn't aware|turns out|happens to be/i,
    /created|developed|invented|designed \(if no before\/after data\)/i,
    // Russian equivalents
    /ии предсказывает|ии оценивает(?! с известной погрешностью)/i,
    /не заметил|не знал|оказывается|как выяснилось/i,
  ];

  for (const pattern of hallucinationPatterns) {
    if (pattern.test(proposal.description)) {
      warnings.push(`Possible hallucination: Only claim things you verified. Mark AI estimates with confidence bounds`);
      break;
    }
  }

  // Check for missing implementation feasibility
  const implText = proposal.description.toLowerCase();
  const hasImplClarity = implText.includes('can') || implText.includes('should') ||
    implText.includes('implement') || implText.includes('do') || implText.includes('change') ||
    implText.includes('можно') || implText.includes('следует') || implText.includes('нужно') ||
    implText.includes('реализовать') || implText.includes('внедрить') || implText.includes('изменить') ||
    implText.includes('добавить') || implText.includes('обновить') || implText.includes('настроить');
  if (!hasImplClarity) {
    warnings.push(`No implementation clarity: Describe what to do, who does it, timeline, risks`);
  }

  // Excessive sycophancy check
  const flattery = [
    /brilliant decision|brilliant move|excellent|genius|smart move|perfect/i,
    /owner's? (?:brilliant|smart|excellent)/i,
    // Russian equivalents
    /блестящее решение|отличное решение|гениально|умный ход|прекрасно|великолепно/i,
    /владелец правильно|директор верно|мудрое решение/i,
  ];

  for (const pattern of flattery) {
    if (pattern.test(proposal.description)) {
      violations.push(`Sycophancy detected: No flattery. Speak directly. "This metric declined 30%, here's why"`);
      break;
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (warnings.length >= 2) confidence = 'medium';
  if (violations.length > 0) confidence = 'low';

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    confidence,
  };
}

/**
 * Sanitize proposal against hallucination patterns
 * Returns true if proposal appears honest and factual
 */
export function isFactualAndHonest(text: string): boolean {
  // Check for extreme confidence without data
  const overconfidentPatterns = [
    /^(?!.*(?:from|show|data|found|discovered|verified|according|analysis|metric|record)).{0,100}will (?:definitely|certainly|obviously|clearly) /i,
  ];

  for (const pattern of overconfidentPatterns) {
    if (pattern.test(text)) return false;
  }

  // Check for invented metrics
  if (/users (probably )?(?:dislike|hate|love|want)/i.test(text)) {
    if (!/(?:nps|rating|survey|complaint|feedback|data|metric)/i.test(text)) return false;
  }

  // Check for unverified causation
  if (/caused by|results from|leads to/i.test(text)) {
    if (!/verified|confirmed|data shows|analysis|evidence/i.test(text)) return false;
  }

  return true;
}

/**
 * Check if proposal shows transparency and acknowledges uncertainty
 */
export function hasTransparency(text: string): boolean {
  const transparencyIndicators = [
    /confidence: (high|medium|low)/i,
    /uncertain|unknown|unclear|need (?:more )?data|insufficient data|requires (?:further )?investigation/i,
    /could be wrong if|assuming|if .*then|depends on/i,
    // Russian equivalents
    /уверенность: (высокая|средняя|низкая)/i,
    /неизвестно|неясно|нужны данные|недостаточно данных|требует проверки|требует анализа/i,
    /могу ошибаться|при условии|если .{0,40}то|зависит от/i,
  ];

  for (const indicator of transparencyIndicators) {
    if (indicator.test(text)) return true;
  }

  // Proposals without any confidence/uncertainty markers get flagged
  return false;
}

/**
 * Extract violations in structured format for logging
 */
export function getSummaryOfViolations(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) return 'Compliant with standards';

  const parts: string[] = [];
  if (result.violations.length > 0) {
    parts.push(`VIOLATIONS (${result.violations.length}): ${result.violations.join('; ')}`);
  }
  if (result.warnings.length > 0) {
    parts.push(`WARNINGS (${result.warnings.length}): ${result.warnings.join('; ')}`);
  }

  return parts.join('\n');
}
