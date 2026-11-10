/**
 * Rex Extension
 *
 * Inside a Rex terminal ($REX_SESSION is set), adds a <rex> system prompt section
 * with Rex's session context: the session and pane IDs, a pointer to the rex skill,
 * and session naming. This matches the SessionStart hook that `rex skill setup`
 * installs for Claude Code and Codex. Outside Rex it does nothing.
 *
 * The section only reaches the model when no other extension returns `systemPrompt`
 * from `before_agent_start`: a returned prompt replaces the whole prompt, sections included.
 *
 * Loaded with the package (see "pi" in package.json), or on its own:
 *   pi --extension agents/pi/extensions/rex.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REX_PROMPT_SECTION = "rex";
const REX_SESSION_START_TIMEOUT_MS = 3000;

export default function rexExtension(pi: ExtensionAPI): void {
	let rexContext = "";

	pi.on("session_start", async (_event, ctx) => {
		rexContext = "";
		if (!process.env.REX_SESSION) return;

		const result = await pi.exec("rex", ["__internal", "session-start", "--agent", "pi"], {
			cwd: ctx.cwd,
			timeout: REX_SESSION_START_TIMEOUT_MS,
		});
		if (result.code === 0) {
			rexContext = result.stdout.trim();
			return;
		}
		if (ctx.hasUI) {
			const reason = result.stderr.trim() || `rex exited with ${result.code}`;
			ctx.ui.notify(`rex: no session context for the system prompt (${reason})`, "warning");
		}
	});

	pi.on("before_agent_start", (event) => {
		const { sections } = event.systemPromptOptions;
		if (rexContext) sections[REX_PROMPT_SECTION] = rexContext;
		else delete sections[REX_PROMPT_SECTION];
	});
}
