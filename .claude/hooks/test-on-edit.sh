#!/usr/bin/env bash
# PostToolUse hook for Edit/Write. When a file under src/ changes, run the
# Vitest file that covers it so the red/green signal shows up right away.
# No formatter is installed in this project, so this replaces "format on save".
set -uo pipefail

file=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)
[ -z "$file" ] && exit 0
case "$file" in
  *src/*.ts|*src/*.tsx) ;;
  *) exit 0 ;;
esac

if [[ "$file" == *.test.ts || "$file" == *.test.tsx ]]; then
  target="$file"
else
  base="${file%.*}"
  ext="${file##*.}"
  if [ -f "$base.test.$ext" ]; then target="$base.test.$ext"
  elif [ -f "$base.test.ts" ]; then target="$base.test.ts"
  elif [ -f "$base.test.tsx" ]; then target="$base.test.tsx"
  else
    echo "test-on-edit: no test file beside $file (TDD rule: write the failing test first)" >&2
    exit 0
  fi
fi

out=$(npx vitest run "$target" 2>&1)
status=$?
if [ $status -ne 0 ]; then
  echo "test-on-edit: $target is RED" >&2
  echo "$out" | tail -40 >&2
else
  echo "test-on-edit: $target is green"
fi
exit 0
