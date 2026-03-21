# AI Resources Usage Rules

## Skill Lookup Priority
1. bkit skills (27): ai-resources/bkit-claude-code/skills/
2. Anthropic official (17): ai-resources/skills/skills/
3. Template library (25 categories): ai-resources/claude-code-templates/cli-tool/components/skills/
4. OpenClaw skills (52): moltbot/skills/

## bkit Pipeline
- New features: 9-phase pipeline (schema→convention→mockup→API→design→UI→SEO→review→deploy)
- Bug fixes: Do→Check (phase 8 review)
- Refactoring: phase 2 (convention) → phase 8 (review)
- Templates: ai-resources/bkit-claude-code/templates/

## MCP References
- Server implementations: ai-resources/mcp-servers/src/
- Use as reference when building new MCP integrations
- Python-based servers (fetch, git) cannot run on this machine
