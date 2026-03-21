---
allowed-tools: Bash, Read, Grep, Glob
description: Search through 785 skills across all repositories
---

Search for skills matching the user's query across all skill repositories:

1. **bkit skills** (27): Search `C:/Users/exodia/.local/bin/ai-resources/bkit-claude-code/skills/*/SKILL.md` for keyword
2. **Anthropic skills** (17): Search `C:/Users/exodia/.local/bin/ai-resources/skills/skills/*/SKILL.md` for keyword
3. **Template skills** (25 categories): Search `C:/Users/exodia/.local/bin/ai-resources/claude-code-templates/cli-tool/components/skills/` directory names and SKILL.md contents
4. **OpenClaw skills** (52): Search `C:/Users/exodia/moltbot/skills/` directory names

Report matches in table:
| Source | Skill Name | Path | Relevance |
|--------|-----------|------|-----------|

If exact match found, read and display the SKILL.md content.
Search query: $ARGUMENTS
