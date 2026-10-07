#!/usr/bin/env bash
#
# End-to-end test for agents/pi/extensions/program-status.ts.
#
# Runs a real interactive Pi inside a private tmux server, records the raw pane
# output with pipe-pane (before tmux parses it), and checks the OSC 7501 reports.
# Makes one small model request.
#
# Usage:
#   tests/program-status.test.sh
#   PI_TEST_MODEL=anthropic/claude-haiku-4-5 tests/program-status.test.sh
#   KEEP=1 tests/program-status.test.sh   # keep the temp dir with the raw log
#
# Requires: pi, tmux, perl (with MIME::Base64).

set -euo pipefail

missing=()
for cmd in pi tmux perl; do
	command -v "$cmd" >/dev/null || missing+=("$cmd")
done
if ((${#missing[@]})); then
	echo "ERROR: missing required commands: ${missing[*]}" >&2
	exit 1
fi
if ! perl -MMIME::Base64 -e1 2>/dev/null; then
	echo "ERROR: perl module MIME::Base64 is not available" >&2
	exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
model="${PI_TEST_MODEL:-openai/gpt-6-luna}"
tmp="$(mktemp -d)"
socket="pi-test-osc7501-$$"
raw="$tmp/raw.log"

cleanup() {
	tmux -L "$socket" kill-server 2>/dev/null || true
	rm -f "${TMUX_TMPDIR:-/tmp}/tmux-$(id -u)/$socket"
	if [[ -n "${KEEP:-}" ]]; then echo "kept $tmp"; else rm -rf "$tmp"; fi
}
trap cleanup EXIT

# Fixture extension: /osc-confirm opens a confirm dialog, which Pi reports as a blocking UI prompt.
cat >"$tmp/confirm.ts" <<'EOF'
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("osc-confirm", {
		description: "Open a confirm dialog",
		handler: async (_args, ctx) => {
			await ctx.ui.confirm("Deploy to production?", "OSC 7501 test");
		},
	});
}
EOF

# Print reports as "state kind=... app=... msg=<decoded>", one per line.
reports() {
	[[ -f "$raw" ]] || return 0
	perl -0777 -ne '
		use MIME::Base64;
		while (/\e\]7501;([^\e\a]*)(?:\e\\|\a)/g) {
			my %r = map { split /=/, $_, 2 } split /:/, $1;
			my @out = ($r{state});
			push @out, "kind=$r{kind}" if $r{kind};
			push @out, "app=$r{app}" if $r{app};
			push @out, "msg=" . decode_base64($r{msg}) if $r{msg};
			print join(" ", @out), "\n";
		}
	' "$raw"
}

wait_for() {
	local pattern="$1" deadline=$((SECONDS + ${2:-30}))
	until reports | grep -qE "$pattern"; do
		if ((SECONDS > deadline)); then
			echo "FAIL: timed out waiting for /$pattern/" >&2
			echo "--- reports so far:" >&2
			reports >&2
			echo "--- screen:" >&2
			tmux -L "$socket" capture-pane -p -t osc >&2 || true
			exit 1
		fi
		sleep 0.2
	done
}

send() {
	tmux -L "$socket" send-keys -t osc -l "$1"
	sleep 0.3
	tmux -L "$socket" send-keys -t osc Enter
}

pi_cmd=(pi --no-session -ne -ns -np -nc --no-mcp
	-e "$root/agents/pi/extensions/program-status.ts" -e "$tmp/confirm.ts"
	--model "$model")

# Start with a delay so pipe-pane is attached before Pi writes anything.
tmux -L "$socket" -f /dev/null new-session -d -s osc -x 120 -y 40 \
	"sleep 1; cd $(printf %q "$tmp") && exec $(printf '%q ' "${pi_cmd[@]}")"
tmux -L "$socket" pipe-pane -O -t osc "cat >> $(printf %q "$raw")"

echo "== startup"
wait_for '^idle app=pi$'

echo "== blocked on a confirm dialog"
send "/osc-confirm"
wait_for '^blocked kind=permission app=pi msg=Deploy to production\?$'
tmux -L "$socket" send-keys -t osc Escape
wait_for '^idle' 10
[[ "$(reports | tail -1)" == "idle app=pi" ]] || { echo "FAIL: expected idle after dialog" >&2; reports >&2; exit 1; }

echo "== agent run with a tool call ($model)"
send 'Use the bash tool to run `echo osc7501`, then reply with exactly: All done'
wait_for '^working app=pi msg=Running bash$' 60
wait_for '^done app=pi msg=All done' 90

echo "== quit"
send "/quit"
wait_for '^clear$' 15

echo "== reports"
reports | sed 's/^/  /'

expected=(
	'idle app=pi'
	'blocked kind=permission app=pi msg=Deploy to production?'
	'idle app=pi'
	'working app=pi'
	'working app=pi msg=Running bash'
	'done app=pi msg=All done'
	'clear'
)
actual="$(reports)"
# Expected reports must appear in order; extra working reports between turns are fine.
i=0
while IFS= read -r line; do
	[[ $i -lt ${#expected[@]} && "$line" == "${expected[$i]}" ]] && i=$((i + 1))
done <<<"$actual"
if ((i < ${#expected[@]})); then
	echo "FAIL: missing or out of order: ${expected[$i]}" >&2
	exit 1
fi

if grep -q '^error' <<<"$actual"; then
	echo "FAIL: unexpected error report" >&2
	exit 1
fi

echo "PASS"
