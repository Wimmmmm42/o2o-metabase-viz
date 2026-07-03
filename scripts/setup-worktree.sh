#!/usr/bin/env sh
# treehouse pre-warm hook.
#
# Runs inside each freshly created worktree so it comes up ready to
# type-check / build / test immediately. Installs all npm-workspace
# dependencies from the lockfile.
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

echo "🌳 pre-warm: npm ci (workspaces)"
npm ci
