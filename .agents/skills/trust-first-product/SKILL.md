---
name: trust-first-product
description: Enforce trust-first product behavior. Use when editing user-facing copy, booking flows, payment steps, AI assistant prompts, success/error messages, or API responses that can overpromise outcomes.
version: 1.0.0
---

# Trust-First Product Skill

Use this workflow whenever changes affect user trust: UI text, chat scripts, booking/payment UX, operator communication, or public metadata.

## Core Standard

1. Do not promise what the system cannot guarantee.
2. Do not hide uncertainty.
3. Do not push payment before conditions are clear.
4. Do not invent availability, price certainty, or operator actions.

## Mandatory Checks

### A. Promise Audit

For each changed text/API message, mark it as:
- Verified fact
- Estimated value
- External dependency
- Unknown/needs clarification

If it is estimated or external, wording must clearly say so.

### B. Booking and Payment Flow

Ensure order is explicit:
1. Request/application created
2. Details confirmed/clarified
3. Payment
4. Fulfillment follow-up

Forbidden examples:
- "Instant confirmation" if operator must respond
- "Guaranteed availability" without lock
- "Payment confirms everything" when post-checks remain

### C. AI Assistant Safety

Assistant responses must:
- Use only available data
- Say when data is missing
- Avoid fabricated certainty
- Offer the next truthful step

### D. UX Tone

Prefer:
- "Оставить заявку"
- "Уточнить детали перед оплатой"
- "Оператор подтвердит условия"

Avoid:
- "Гарантировано"
- "Мгновенно"
- "100%" (unless mathematically and operationally true)

## Output Contract for PRs

Include a short trust report:
1. What promises were removed or softened
2. What flow steps were clarified
3. Any remaining risk areas with exact file paths

## Quick Regression List

Before finishing, scan for risky words in changed files:
- "мгнов"
- "гарант"
- "100%"
- "безусловно"
- "автоматически подтверждено"

If found, verify each case is truly guaranteed by implementation.
