Open or prepare an architecture dashboard from the generated knowledge graph.

## Preconditions

1. Check that `.understand-anything/knowledge-graph.json` exists.
2. If missing, respond:
   `No knowledge graph found. Run /understand first to analyze this project.`
3. Stop if missing.

## Behavior

1. If a local Understand-Anything dashboard package is available in this repo, provide exact run commands to start it.
2. If not available, provide a fallback architecture view in markdown:
   - layer map
   - top central modules
   - high-coupling hotspots
   - suggested next exploration steps

## Fallback Deliverable

When dashboard code is absent, output:

- `Architecture Snapshot`
- `Critical Dependency Paths`
- `Risk Hotspots`
- `Suggested Deep-Dive Queries` for `/understand-chat`

Keep output concise and actionable.