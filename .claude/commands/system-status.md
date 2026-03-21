---
allowed-tools: Bash, Read, Grep
description: Full Nava system status check — Exodia services, bots, CDP, network
---

Run a comprehensive Nava system status check:

1. Run `node C:/Users/exodia/.local/bin/Nava/Nava/naba-tools/nava.mjs status` for unified status
2. If any service is down, diagnose:
   - SSH into clone computer: `ssh codin@100.85.94.83 "netstat -ano | findstr LISTENING"`
   - Check Exodia services: `curl -s http://100.75.212.102:7778/health` (repeat for 7779-7781)
   - Check CDP: `curl -s http://localhost:9222/json/version`
3. Report in table format with service name, status (UP/DOWN), and detail
4. If anything is DOWN, provide specific restart command
