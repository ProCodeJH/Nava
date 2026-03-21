# Nava System Rules

## CLI Usage
- Always use full path: `node C:/Users/exodia/.local/bin/Nava/Nava/naba-tools/nava.mjs`
- All nava.mjs commands output JSON — parse before displaying

## Network
- Classroom (Exodia): 100.75.212.102 (ports 7778-7781)
- CDP: 9222 (Antigravity), 9333 (Exodia)
- All connections via Tailscale VPN

## Secrets
- Never log or display: auth profiles, tokens
- Use `***` when referencing token values in output

## Timeouts
- CDP: 5s
