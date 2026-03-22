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
  ];

  for (const pattern of unverifiedPatterns) {
    if (pattern.test(description)) {
      violations.push(`Unverified claim detected: Use data, not guesses. Avoid "probably", "likely", "seems", "I think"`);
      break;
    }
  }

  // FLAG 2: Check for false urgency without justification
  const urgencyPatterns = [
    /must act immediately|act now|critical urgency|emergency|asap/i,
  ];

  for (const pattern of urgencyPatterns) {
    if (pattern.test(description) && !description.toLowerCase().includes('will cause') &&
        !description.toLowerCase().includes('lead to') && !description.toLowerCase().includes('result in')) {
      warnings.push(`False urgency detected: Cite consequences. Why now vs later?`);
      break;
    }
  }

  // FLAG 3: Check for oversimplification
  const oversimplifPatterns = [
    /operators? (?:are) (?:unmotivated|lazy|incompetent)/i,
    /tourists? (?:don't|don't) understand|tourists? (?:are) dumb/i,
    /\ball \w+ (?:are|is)/i,  // "all X are..."
  ];

  for (const pattern of oversimplifPatterns) {
    if (pattern.test(description)) {
      violations.push(`Oversimplification: Name specific cases, acknowledge complexity. Avoid blanket statements like "all X are Y"`);
      break;
    }
  }

  // FLAG 4: Check for agent bias (bias toward role's interests)
  if (agentId === 'security' && description.toLowerCase().includes('potential security risk')) {
    warnings.push(`Potential Security agent bias: Quantify exploitability, don't just assume hypothetical threat`);
  }
  if (agentId === 'eco' && description.toLowerCase().includes('tourism damages')) {
    warnings.push(`Potential Eco agent bias: Cite impact studies, don't assume activism is fact`);
  }
  if (agentId === 'rescue' && description.toLowerCase().includes('need more resources')) {
    warnings.push(`Potential Rescue agent bias: Show incident trend data, don't just request resources`);
  }

  // FLAG 5: Check for hallucinated features
  const hallucinationPatterns = [
    /ai predicts|ai estimates(?!\s+with confidence bounds)/i,
    /didn't notice|wasn't aware|turns out|happens to be/i,
    /created|developed|invented|designed \(if no before\/after data\)/i,
  ];

  for (const pattern of hallucinationPatterns) {
    if (pattern.test(description)) {
      warnings.push(`Possible hallucination: Only claim things you verified. Mark AI estimates with confidence bounds`);
      break;
    }
  }

  // Check for missing implementation feasibility
  if (!description.toLowerCase().includes('can') && !description.toLowerCase().includes('should') &&
      !description.toLowerCase().includes('implement') && !description.toLowerCase().includes('do') &&
      !description.toLowerCase().includes('change')) {
    warnings.push(`No implementation clarity: Describe what to do, who does it, timeline, risks`);
  }

  // Excessive sycophancy check
  const flattery = [
    /brilliant decision|brilliant move|excellent|genius|smart move|perfect/i,
    /owner's? (?:brilliant|smart|excellent)/i,
  ];

  for (const pattern of flattery) {
    if (pattern.test(description)) {
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
