Generate an onboarding guide for new contributors using the project knowledge graph.

## Preconditions

1. Check that `.understand-anything/knowledge-graph.json` exists.
2. If missing, respond:
   `No knowledge graph found. Run /understand first to analyze this project.`
3. Stop if missing.

## Data Sources

- Primary: `.understand-anything/knowledge-graph.json`
- Verification: key files from `app/`, `components/`, `lib/`, and `docs/` as needed

## Guide Structure

Create a markdown onboarding document with these sections:

1. `Project Overview`
2. `Architecture Map` (layers and module responsibilities)
3. `Core Business Flows`
4. `Key Directories and What Lives There`
5. `Top 10 Files to Read First`
6. `How to Run, Test, and Validate`
7. `Common Pitfalls and Guardrails`
8. `First Week Task Plan` (day-by-day)

## Output Requirements

- Keep it practical and repo-specific.
- Include exact file paths.
- Include at least one suggested path for:
  - frontend contributor
  - backend contributor
  - full-stack contributor

At the end, offer to save the guide to `docs/ONBOARDING_AUTO.md`.