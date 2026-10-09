#!/bin/sh
set -eu

mkdir -p /data/export
set -- emulators:start \
  --project "${FIREBASE_PROJECT_ID:-demo-omreznina}" \
  --config /app/firebase.json \
  --only auth,firestore \
  --non-interactive \
  --export-on-exit=/data/export

if [ -f /data/export/firebase-export-metadata.json ]; then
  set -- "$@" --import=/data/export
fi

# Keep Firebase as the main process so SIGINT triggers the persistent export.
exec firebase "$@"
