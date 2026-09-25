#!/usr/bin/env bash
# Stop hook: macOS notification when Claude finishes a turn.
command -v osascript >/dev/null 2>&1 || exit 0
osascript -e 'display notification "Claude finished in tic-tac-toe" with title "Claude Code"' >/dev/null 2>&1 || true
exit 0
