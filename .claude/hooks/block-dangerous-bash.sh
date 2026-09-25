#!/usr/bin/env bash
# PreToolUse hook for Bash. Reads the tool call as JSON on stdin and exits 2
# (blocking the call) when the command is one we never want run by an agent.
set -euo pipefail

cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)
[ -z "$cmd" ] && exit 0

block() { echo "Blocked by .claude/hooks/block-dangerous-bash.sh: $1" >&2; exit 2; }

echo "$cmd" | grep -Eq '(^|[;&| ])rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)' && block "rm -rf is not allowed; delete files by hand."
echo "$cmd" | grep -Eq 'git[[:space:]]+push[^|;&]*(--force|-f([[:space:]]|$)|\+[a-zA-Z])' && block "force-push is not allowed."
echo "$cmd" | grep -Eq 'git[[:space:]]+push[^|;&]*[[:space:]](origin[[:space:]]+)?main([[:space:]]|$)' && block "pushing straight to main is not allowed; PRs target develop, releases go develop -> main by PR."
echo "$cmd" | grep -Eq 'git[[:space:]]+(reset[[:space:]]+--hard|checkout[[:space:]]+--[[:space:]]+\.|clean[[:space:]]+-[a-zA-Z]*f)' && block "destructive git resets are not allowed."
echo "$cmd" | grep -Eq 'git[[:space:]]+branch[[:space:]]+-D' && block "git branch -D is not allowed; use -d after merge."
echo "$cmd" | grep -Eq '(>|>>|tee)[[:space:]]*\.env([[:space:]]|$|\.)' && block ".env files are owned by the user; update .env.example instead."
echo "$cmd" | grep -Eq '(sed[[:space:]]+-i|cp|mv)[^|;&]*[[:space:]]\.env([[:space:]]|$)' && block ".env files are owned by the user; update .env.example instead."

exit 0
