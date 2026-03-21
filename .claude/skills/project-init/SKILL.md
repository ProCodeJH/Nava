---
name: project-init
description: |
  Initialize new projects with proper structure, config, and boilerplate.
  Triggers: init, create project, new project, scaffold, boilerplate, starter, setup,
  프로젝트 만들어, 새 프로젝트, 초기화, 셋업, 보일러플레이트, 스타터,
  새로 시작, 빈 프로젝트, 처음부터 만들자, 프로젝트 생성, 템플릿으로,
  next.js 프로젝트, react 앱, node 서버, 파이썬 프로젝트
context: fork
agent: general-purpose
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Project Init

Set up a new project with proper structure, configuration, and tooling.

## Task
Initialize a project: $ARGUMENTS

## Decision Tree
Determine project type and apply the right template:

### Web (Next.js / React)
```
├── src/
│   ├── app/           # App Router
│   ├── components/    # UI components
│   ├── lib/           # Utilities
│   └── styles/        # Global CSS
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── .gitignore
└── CLAUDE.md
```

### API (Node.js / Express / Hono)
```
├── src/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

### Python
```
├── src/
│   └── project_name/
├── tests/
├── pyproject.toml
├── requirements.txt
└── CLAUDE.md
```

### CLI Tool (Node.js)
```
├── src/
│   ├── commands/
│   ├── utils/
│   └── index.ts
├── package.json (bin field)
└── CLAUDE.md
```

## Rules
- Always include .gitignore, .env.example, CLAUDE.md
- ESM only for JS/TS projects
- Use latest stable versions of dependencies
- Include basic test setup (Vitest for JS, pytest for Python)
- Ask user for project name if not provided
