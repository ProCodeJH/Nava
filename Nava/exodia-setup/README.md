# Exodia 학원 컴 세팅

학원 컴(100.75.212.102)에서 Claude Code 키면 서비스 자동 실행되게 하는 설정.

## 설치 (학원 컴에서 1회)

1. exodia 스크립트 폴더 복사:
```bash
mkdir C:\Users\MIN\exodia
copy start-services.js C:\Users\MIN\exodia\
copy screen_service.py C:\Users\MIN\exodia\
copy orchestrator.py C:\Users\MIN\exodia\
copy brain_bridge.js C:\Users\MIN\exodia\
copy hide-daemon.py C:\Users\MIN\exodia\
```

2. Claude Code 설정 복사:
```bash
mkdir C:\Users\MIN\.claude
copy settings.local.json C:\Users\MIN\.claude\
```

3. Claude Code 실행 → SessionStart hook이 4개 서비스 자동 시작
