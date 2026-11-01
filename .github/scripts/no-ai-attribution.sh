#!/usr/bin/env bash
# Fails if any commit in base..head has an AI author, committer or attribution line.
set -uo pipefail
base="${1:-}"; head="${2:-HEAD}"
if [ -z "$base" ] || [ "$base" = "0000000000000000000000000000000000000000" ]; then range="$head"; else range="$base..$head"; fi
pattern='claude|anthropic|openai|chatgpt|copilot|cursor|codex|gemini|devin'
bad=0
while IFS= read -r sha; do
  who="$(git log -1 --format='%an <%ae>%n%cn <%ce>' "$sha")"
  msg="$(git log -1 --format='%B' "$sha")"
  if printf '%s\n' "$who" | grep -qiE "$pattern"; then echo "::error::$sha has an AI author or committer"; bad=1; fi
  if printf '%s\n' "$msg" | grep -qiE "^(co-authored-by|claude-session|generated-with).*($pattern)|claude\.ai/code|noreply@anthropic\.com"; then echo "::error::$sha has an AI attribution line"; bad=1; fi
done < <(git rev-list "$range")
[ "$bad" -eq 0 ] && echo "No AI attribution found."
exit "$bad"
