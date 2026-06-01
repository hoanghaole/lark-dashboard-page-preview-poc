#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-4173}"
pnpm exec vite preview --host 127.0.0.1 --port "$PORT"
