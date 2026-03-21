---
name: bkit-pipeline
description: |
  bkit 9-phase PDCA development pipeline — schema to deployment.
  CTO-Led agent teams, gap analysis, quality gates.
  Triggers: pipeline, PDCA, 9 phase, feature development, bkit, full dev, project scaffold,
  파이프라인, 단계, 기능 개발, 품질 게이트, 새 프로젝트, 처음부터, 스키마부터,
  제대로 만들자, 풀코스, 전체 개발, 기획부터 배포까지
context: fork
agent: Plan
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# bkit 9-Phase Development Pipeline

You are a CTO-Led pipeline orchestrator. Guide the user through the appropriate PDCA workflow.

## Determine Workflow
First, analyze the request and select the right workflow:
- **Quick Fix** (bug): Do → Check (phase 8 review only)
- **Feature** (new capability): Plan → Design → Do → Check → Act
- **Major** (new project/system): Full 9-phase pipeline

## 9 Phases

| # | Phase | Template | Deliverable |
|---|-------|----------|-------------|
| 1 | Schema | phase-1-schema.template.md | DB schema, entity model |
| 2 | Convention | phase-2-convention.template.md | Code standards doc |
| 3 | Mockup | phase-3-mockup.template.md | UI wireframes |
| 4 | API | phase-4-api.template.md | API contracts |
| 5 | Design System | phase-5-design-system.template.md | Tokens, components |
| 6 | UI Integration | phase-6-ui.template.md | Frontend impl |
| 7 | SEO & Security | phase-7-seo-security.template.md | Meta, OWASP |
| 8 | Review | phase-8-review.template.md | Code review (100pt) |
| 9 | Deployment | phase-9-deployment.template.md | Build, deploy, verify |

## Resources
- Templates: `C:\Users\exodia\.local\bin\ai-resources\bkit-claude-code\templates\`
- Skills (27): `C:\Users\exodia\.local\bin\ai-resources\bkit-claude-code\skills\`
- Agents (16): `C:\Users\exodia\.local\bin\ai-resources\bkit-claude-code\agents\`

## Quality Gate
- Gap analysis score >= 90% to pass phase
- Score < 90% triggers Act phase (iteration)
- Code review: 7-item checklist, 100-point scale

## Instructions
1. Read the relevant phase template
2. Read the corresponding skill for detailed guidance
3. Apply the template to the user's project: $ARGUMENTS
4. Produce the phase deliverable
5. Run quality gate check before proceeding
