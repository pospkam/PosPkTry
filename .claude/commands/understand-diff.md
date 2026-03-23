Analyze the current git changes using the project knowledge graph and report what may break.

## Inputs

- Compare both staged and unstaged changes.
- If available, include untracked source files that are part of the change.

## Preconditions

1. Check that `.understand-anything/knowledge-graph.json` exists.
2. If missing, respond:
   `No knowledge graph found. Run /understand first to analyze this project.`
3. Stop if missing.

## Analysis Workflow

1. Enumerate changed files (`git diff --name-only`, `git diff --cached --name-only`).
2. For each changed file, map it to related nodes and edges in `.understand-anything/knowledge-graph.json`.
3. Identify transitive impact:
   - callers/importers
   - API contracts
   - DB touchpoints
   - role/auth boundaries
   - external integrations
4. Detect high-risk change types:
   - auth/permission logic
   - payments/safety flows
   - schema/query changes
   - public API response shape changes
   - shared UI primitives

## Output Format

Provide sections in this order:

1. `Diff Summary`
2. `Potential Breaking Changes` (High/Medium/Low)
3. `Affected Areas` (features, routes, services)
4. `Regression Risks`
5. `Required Tests` (specific test cases)
6. `Recommended Mitigations`

Be concrete with exact file paths and explain why each risk exists.