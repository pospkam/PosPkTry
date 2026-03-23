Provide a deep explanation of a specific file, module, or symbol using the knowledge graph.

Use the argument as target: `$ARGUMENTS`

## Preconditions

1. Check that `.understand-anything/knowledge-graph.json` exists.
2. If missing, respond:
   `No knowledge graph found. Run /understand first to analyze this project.`
3. If `$ARGUMENTS` is empty, ask for a target path or symbol.

## Explanation Workflow

1. Resolve target node(s) in graph (`file`, `function`, `class`, `service`).
2. Gather neighbors:
   - dependencies/imports
   - inbound references/callers
   - related routes/components/services
3. Validate important claims against source files.

## Output Format

1. `What It Does`
2. `Where It Sits In Architecture`
3. `Inputs and Outputs`
4. `Dependencies`
5. `Who Depends On It`
6. `Failure Modes / Edge Cases`
7. `Safe Refactor Checklist`

Use precise file paths and avoid generic statements.