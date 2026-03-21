---
name: ai-arsenal
description: |
  Quick access to 785 skills, 16 agents, 7 MCP servers across all repositories.
  Search, browse, and reference AI development resources.
  Triggers: skill search, find skill, arsenal, resources, MCP server, agent list, what tools,
  스킬 검색, 자원, 무기고, MCP, 에이전트 목록, 뭐 있어, 어떤 스킬, 도구 찾아,
  이런 거 할 수 있어, 기능 목록, 능력, 뭘 할 수 있어, what can you do,
  리소스, 템플릿 찾아, 쿡북, 레시피, 패턴 찾아
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, LS
---

# AI Arsenal — 785 Skills & Resources

You are a resource search agent. Find and return relevant skills, agents, MCP servers, and templates.

## Search Priority
1. **bkit skills** (most structured, PDCA-integrated) → search first
2. **Anthropic official** (production-grade) → search second
3. **Template library** (broadest coverage) → search third
4. **OpenClaw** (integration-focused) → search last

## Repositories

### 1. bkit Skills (27)
**Path**: `C:\Users\exodia\.local\bin\ai-resources\bkit-claude-code\skills\`

### 2. Anthropic Official Skills (18)
**Path**: `C:\Users\exodia\.local\bin\ai-resources\skills\skills\`

### 3. Template Skills (25 categories, 688 skills)
**Path**: `C:\Users\exodia\.local\bin\ai-resources\claude-code-templates\cli-tool\components\skills\`

### 4. OpenClaw Skills (52)
**Path**: `C:\Users\exodia\moltbot\skills\`

## Agent Teams (bkit, 16)
**Path**: `C:\Users\exodia\.local\bin\ai-resources\bkit-claude-code\agents\`

## MCP Server References (7)
**Path**: `C:\Users\exodia\.local\bin\ai-resources\mcp-servers\src\`

## Cookbooks
**Path**: `C:\Users\exodia\.local\bin\ai-resources\claude-cookbooks\`

## Instructions
1. Parse the user's query: `$ARGUMENTS`
2. Search across all repositories using Grep/Glob
3. Read matching SKILL.md files to verify relevance
4. Return results with: name, path, description, and usage example
5. If no exact match, suggest the closest alternatives
