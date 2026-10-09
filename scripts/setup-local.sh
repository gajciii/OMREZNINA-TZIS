#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

for executable in node npm java; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    echo "Manjka $executable. Namesti Node.js 22+ in JDK 21+ (glej README.md)." >&2
    exit 1
  fi
done
node --input-type=module -e '
  import { spawnSync } from "node:child_process";
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 12)) {
    console.error("Potreben je Node.js 20.12+; priporočamo Node.js 22 ali 24.");
    process.exit(1);
  }
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  const version = `${result.stdout}${result.stderr}`.match(/version "(\d+)/);
  if (result.status !== 0 || !version || Number(version[1]) < 21) {
    console.error("Potreben je JDK 21 ali novejši.");
    process.exit(1);
  }
'

PYTHON_BIN="${OMREZNINA_PYTHON:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  for candidate in python3.12 python3.13 python3.11 python3.14 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if (3,11) <= sys.version_info < (3,15) else 1)' 2>/dev/null; then
      PYTHON_BIN="$candidate"
      break
    fi
  done
fi
if [[ -z "$PYTHON_BIN" ]] || ! "$PYTHON_BIN" -c 'import sys; sys.exit(0 if (3,11) <= sys.version_info < (3,15) else 1)' 2>/dev/null; then
  echo "Potreben je Python 3.11–3.14; priporočamo 3.12. Nastavi OMREZNINA_PYTHON za izbiro." >&2
  exit 1
fi

mkdir -p .local/logs .local/firebase-cache .local/config
if [[ ! -x node_modules/.bin/firebase || ! -f .local/root-deps.ready || package-lock.json -nt .local/root-deps.ready || package.json -nt .local/root-deps.ready ]]; then
  echo "Nameščam lokalna orodja Firebase …"
  npm ci --no-audit --no-fund
  touch .local/root-deps.ready
fi
if [[ ! -x frontend/node_modules/.bin/vite || ! -f .local/frontend-deps.ready || frontend/package-lock.json -nt .local/frontend-deps.ready || frontend/package.json -nt .local/frontend-deps.ready ]]; then
  echo "Nameščam frontend …"
  npm ci --prefix frontend --legacy-peer-deps --no-audit --no-fund
  touch .local/frontend-deps.ready
fi
if [[ ! -x .venv/bin/python ]]; then
  echo "Pripravljam Python okolje ($PYTHON_BIN) …"
  "$PYTHON_BIN" -m venv .venv
fi
if [[ ! -f .local/python-deps.ready || python_helper/requirements.txt -nt .local/python-deps.ready || prekoracitev_helper/requirements.txt -nt .local/python-deps.ready || predikcija_helper/requirements.txt -nt .local/python-deps.ready ]]; then
  echo "Nameščam Python storitve …"
  .venv/bin/python -m pip install --disable-pip-version-check -r python_helper/requirements.txt -r prekoracitev_helper/requirements.txt -r predikcija_helper/requirements.txt
  touch .local/python-deps.ready
fi

export FIREBASE_EMULATORS_PATH="$PROJECT_DIR/.local/firebase-cache"
export XDG_CONFIG_HOME="$PROJECT_DIR/.local/config"
export CI=true
if [[ ! -f .local/emulators.ready || package-lock.json -nt .local/emulators.ready ]]; then
  echo "Pripravljam emulatorja in lokalni upravljalnik Firebase …"
  node_modules/.bin/firebase setup:emulators:firestore
  node_modules/.bin/firebase setup:emulators:ui
  touch .local/emulators.ready
fi

JAR_PATH="backend/target/omreznina-0.0.1-SNAPSHOT.jar"
if [[ ! -f "$JAR_PATH" ]] || [[ -n "$(find backend/src/main backend/pom.xml -type f -newer "$JAR_PATH" -print -quit 2>/dev/null)" ]]; then
  echo "Gradim backend …"
  if command -v mvn >/dev/null 2>&1; then
    mvn -B -ntp -f backend/pom.xml -DskipTests package
  else
    (cd backend && bash mvnw -B -ntp -DskipTests package)
  fi
fi
echo "Lokalno okolje je pripravljeno."
