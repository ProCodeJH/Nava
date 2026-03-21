# Code Quality Rules

## JavaScript/TypeScript
- ESM only (import/export), no CommonJS (require)
- Node.js v24 features allowed: native fetch, structuredClone, crypto.randomUUID
- Prefer const/let, never var
- async/await over .then() chains
- Error handling: try/catch at boundaries, let errors propagate internally

## File Conventions
- kebab-case for files: my-component.ts
- PascalCase for React components: MyComponent.tsx
- camelCase for functions/variables
- UPPER_SNAKE for constants/env vars

## Testing
- Vitest for unit tests, Playwright for E2E
- Test files: *.test.ts or *.spec.ts
- No Jest — Vitest exclusively

## Git
- Conventional commits: feat:, fix:, refactor:, docs:, test:, chore:
- Branch naming: feature/, fix/, refactor/
- Never force push to main
