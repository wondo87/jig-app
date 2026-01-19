#!/usr/bin/env bash
# 간단한 로컬 검증 스크립트: headless_schedule_check.mjs를 --verify 모드로 실행
set -e
NODE_BIN=$(command -v node || true)
if [ -z "$NODE_BIN" ]; then
  echo "Node.js를 찾을 수 없습니다. 설치 후 다시 시도하세요."
  exit 1
fi

echo "Running headless verification..."
# 이 스크립트는 headless_schedule_check.mjs가 --verify를 지원한다고 가정합니다.
node headless_schedule_check.mjs --verify
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "Local verification failed (exit $EXIT_CODE). Commit aborted."
  exit $EXIT_CODE
fi

echo "Local verification passed."
exit 0
