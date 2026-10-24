#!/usr/bin/env bash
# Rebuilds the back-office records, snapshots HQ + report, builds the static site into the Whop app and deploys it.
#   scripts/publish-site.sh <whop-app-dir> [back-office-url]
set -euo pipefail
APP="$1"; BO="${2:-http://localhost:3500}"
SNAP="$(mktemp -d)"
curl -sf "$BO/api/hq" > "$SNAP/state.json"
curl -sf "$BO/hq" > "$SNAP/hq.html"
curl -sf "$BO/report" > "$SNAP/report.html"
DATA_FILE="$SNAP/unused.json" node scripts/build-site.js "$APP/public" --state="$SNAP/state.json" --snapshots="$SNAP"
cd "$APP" && whop apps deploy --format json | tail -6
