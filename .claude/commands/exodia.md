Exodia remote control interface. Execute commands on the Exodia infrastructure.

Available targets:
- **classroom** (100.75.212.102): Screen Service, Orchestrator, Brain Bridge, hide-daemon
- **clone** (100.85.94.83): 5 child bots (Webi, Appi, Gami, Ssoki, Booki)

Available actions:
- `status` — Check all services
- `screenshot` — Take screenshot via Screen Service (port 7778)
- `send <bot> <message>` — Send message to a bot via CDP
- `restart <service>` — Restart a specific service
- `arrange` — Arrange windows via hide-daemon
- `show/hide` — Show/hide Antigravity windows

Parse the user's intent from $ARGUMENTS and execute the appropriate action.
Use curl for HTTP APIs, ssh for direct commands.
Korean 반말.
