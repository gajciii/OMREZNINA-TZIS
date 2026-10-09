#!/usr/bin/env bash
set -euo pipefail
# Finder launches .command files in Terminal; Homebrew may be absent from PATH.
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/openjdk/bin:/usr/local/bin:$PATH"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
bash start-local.sh
