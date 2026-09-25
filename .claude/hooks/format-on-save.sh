#!/usr/bin/env bash
# PostToolUse hook for Edit/Write: run Prettier on the file that was just changed.
set -uo pipefail
file=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)
{ [ -z "$file" ] || [ ! -f "$file" ]; } && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md) ;;
  *) exit 0 ;;
esac
npx prettier --write --log-level warn "$file" >/dev/null 2>&1 || echo "format-on-save: prettier could not format $file" >&2
exit 0
