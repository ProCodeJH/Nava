---
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
description: Start bkit 9-phase development pipeline for a new feature
---

Initialize the bkit 9-phase PDCA pipeline for a feature:

## Pipeline Phases
1. **Schema** — Define data models, database schema, entity relationships
2. **Convention** — Set coding standards, naming conventions, folder structure
3. **Mockup** — Create UI wireframes, user flow diagrams
4. **API** — Design API endpoints, request/response contracts
5. **Design System** — Build design tokens, component library
6. **UI Integration** — Implement frontend with design system components
7. **SEO & Security** — Meta tags, OWASP checks, CSP headers
8. **Review** — Code review with bkit checklist (100-point scale)
9. **Deployment** — Build, test, deploy, verify

## Templates
Load templates from: `C:/Users/exodia/.local/bin/ai-resources/bkit-claude-code/templates/pipeline/`

## Process
1. Read the phase template for current phase
2. Create deliverable document in project's docs/ directory
3. Execute the phase requirements
4. Run gap analysis (Check phase)
5. If score >= 90%, proceed to next phase
6. If score < 90%, iterate (Act phase)

Feature: $ARGUMENTS
