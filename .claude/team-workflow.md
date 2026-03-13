# KamchatourHub — Team Workflow & Claude Code Best Practices

## Parallel Execution

- Run 5 Claude instances in parallel (separate tabs)
- Use system notifications / Terminal 2 / multiple terminals
- Pass tasks via `&` or `claude --teleport` + local code
- Use inline bash for acceleration

## Agent Memory Management

- File: `Claude.md` — shared across entire team
- Everyone contributes updates
- Review 5–10 times per week for errors
- Keep concise — move detailed notes to topic files
- Update or remove memories that become outdated

## Testing & Verification

- Chrome extensions for UI testing
- Simulators and domain-specific bash tests
- Use Ralph Wiggum agent for autonomous long-task execution

## Long-Running Tasks

- Use Big Agent for complex work
- Ralph Wiggum for high-volume checking
- Start most sessions in Plan mode
- Auto-accept file changes (one-shot mode)

## Permissions & Access

- NEVER use `--dangerously-skip-safe-commands`
- Store permission mode in `.claude/permissions.json` as `dontAsk`

## Key File Locations

- `.claude/settings.json` — project configuration
- `.claude/agents/` — custom sub-agents for projects
- `.claude/managed-settings.json` — enterprise settings
- `.claude/commands/` — custom Claude commands
- `.claude-plugin/plugin.json` — plugin metadata
- `.claude/MEMORY.md` — persistent memory (200-line limit)

## Project-Specific Status

**Current Phase**: Post-MVP Polish
- ✅ Zod validation: 100% (200+ routes)
- ✅ TypeScript: 0 errors
- ✅ Tests: 214/214 passing
- ✅ CI/CD: Active
- Ready for production deployment

**Team Contacts**:
- Primary: try ai coding <pospkam@gmail.com>
- Deploy: Timeweb Cloud (App ID: 159529)
- Branch: main (auto-deploy on push)
