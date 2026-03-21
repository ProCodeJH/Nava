Run a full system health check:

1. Check Exodia services (100.75.212.102):
   - Port 7778 (Screen Service)
   - Port 7779 (Orchestrator)
   - Port 7780 (Brain Bridge)
   - Port 7781 (hide-daemon)

2. Check child bots on clone computer (100.85.94.83):
   - Webi (18790), Appi (18810), Gami (18820), Ssoki (18830), Booki (18840)

3. Use curl or similar to hit each endpoint's /status

4. Report results in a compact table:
   | Service | Status | Response Time |

5. If anything is down, attempt diagnosis and suggest fix.

Report concisely. Korean 반말.
