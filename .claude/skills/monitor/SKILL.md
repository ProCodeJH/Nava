---
name: monitor
description: |
  Monitor processes, logs, builds, deploys, and system resources in real-time.
  Triggers: monitor, watch, log, tail, follow, track, status, process, running,
  모니터링, 감시, 로그, 추적, 실시간, 돌아가는 거 봐, 프로세스,
  빌드 상태, 배포 상태, 뭐 돌아가고 있어, 확인해, 지켜봐,
  메모리, CPU, 디스크, 네트워크, 포트, 누가 쓰고 있어
context: inline
allowed-tools: Bash, Read, Grep
---

# Monitor

Real-time monitoring of processes, logs, builds, and system resources.

## Task
Monitor target: $ARGUMENTS

## Capabilities

### Process Monitoring
```bash
# List running processes
tasklist /FI "IMAGENAME eq node.exe"
# Port usage
netstat -ano | findstr :PORT
# Kill process
taskkill /PID <pid> /F
```

### Log Tailing
```bash
# Follow a log file (Windows)
Get-Content -Path "log.txt" -Tail 50 -Wait
# Or with bash
tail -f /path/to/log
```

### Build/Deploy Status
```bash
# Vercel deployments
npx vercel ls
# GitHub Actions
gh run list --limit 5
gh run view <run-id>
```

### System Resources
```bash
# Disk usage
wmic logicaldisk get size,freespace,caption
# Memory
wmic OS get FreePhysicalMemory,TotalVisibleMemorySize
# Network
ipconfig /all
ping -n 1 100.75.212.102
```

### Node.js Specific
```bash
# Running node processes
tasklist /FI "IMAGENAME eq node.exe" /V
# npm/pnpm scripts running
npm ls --depth=0
```

## Instructions
1. Parse what the user wants to monitor: $ARGUMENTS
2. Select the appropriate monitoring command
3. Execute and format the output clearly
4. Suggest follow-up actions if issues found
