/**
 * Program Status Extension
 *
 * Reports Pi's state to the terminal with the Program Status Protocol (OSC 7501),
 * so terminals and agent inboxes can show whether Pi is working, waiting on you, or done.
 * Spec: https://www.superlogical.com/rex/docs/build/program-status
 *
 *   idle     waiting for the next prompt, or the run was cancelled
 *   working  agent run in progress; msg names the running tool
 *   blocked  an extension dialog waits on the user; msg is its title
 *   done     run finished; msg is the first line of the answer
 *   error    run failed; msg is the error
 *
 * Usage:
 *   pi --extension agents/pi/extensions/program-status.ts
 *
 * Set PI_PROGRAM_STATUS=0 to disable.
 */

import type { ExtensionAPI, UIPromptKind } from "@earendil-works/pi-coding-agent";

type Report = {
	state: "idle" | "working" | "blocked" | "done" | "error";
	kind?: "permission" | "question";
	msg?: string;
};

const MAX_MSG_LENGTH = 200;

const PROMPT_KINDS: Partial<Record<UIPromptKind, Report["kind"]>> = {
	confirm: "permission",
	select: "question",
	input: "question",
	editor: "question",
};

/** One line without control characters; the spec rejects reports whose msg contains them. */
function toMessage(text: string): string {
	const line = text.replace(/[\u0000-\u001f\u007f-\u009f\s]+/g, " ").trim();
	return line.length > MAX_MSG_LENGTH ? `${line.slice(0, MAX_MSG_LENGTH - 1)}…` : line;
}

export function formatReport(report: Report | "clear"): string {
	if (report === "clear") return "\x1b]7501;state=clear\x1b\\";

	const pairs = [`state=${report.state}`, "app=pi"];
	if (report.kind) pairs.push(`kind=${report.kind}`);
	const msg = report.msg && toMessage(report.msg);
	if (msg) pairs.push(`msg=${Buffer.from(msg).toString("base64")}`);
	return `\x1b]7501;${pairs.join(":")}\x1b\\`;
}

function getOutcome(messages: readonly any[]): Report {
	const last = messages.findLast((message) => message.role === "assistant");
	if (last?.stopReason === "aborted") return { state: "idle" };
	if (last?.stopReason === "error") return { state: "error", msg: last.errorMessage ?? "Request failed" };

	const text = (last?.content ?? [])
		.filter((block: any) => block.type === "text")
		.map((block: any) => block.text)
		.join("\n");
	const summary = text
		.split("\n")
		.map((line: string) => line.replace(/^[#>*\-\s]+/, ""))
		.find(Boolean);
	return { state: "done", msg: summary };
}

export default function (pi: ExtensionAPI) {
	if (process.env.PI_PROGRAM_STATUS === "0") return;

	let enabled = false;
	let running = false;
	let lastSequence = "";
	let outcome: Report = { state: "idle" };
	let prompt: Report | undefined;
	const tools = new Map<string, string>();

	function currentReport(): Report {
		if (prompt) return prompt;
		if (running) return { state: "working", msg: [...tools.values()].at(-1) };
		return outcome;
	}

	function update() {
		if (!enabled) return;
		const sequence = formatReport(currentReport());
		if (sequence === lastSequence) return;
		lastSequence = sequence;
		process.stdout.write(sequence);
	}

	pi.on("session_start", async (_event, ctx) => {
		enabled = ctx.mode === "tui" && process.stdout.isTTY === true;
		lastSequence = "";
		update();
	});

	pi.on("agent_start", async () => {
		running = true;
		update();
	});

	pi.on("tool_execution_start", async (event) => {
		if (event.parentToolCallId) return;
		tools.set(event.toolCallId, `Running ${event.toolName}`);
		update();
	});

	pi.on("tool_execution_end", async (event) => {
		tools.delete(event.toolCallId);
		update();
	});

	// agent_end can be followed by retries, compaction, or queued messages,
	// so only report the outcome once the run has settled.
	pi.on("agent_end", async (event) => {
		outcome = getOutcome(event.messages);
	});

	pi.on("agent_settled", async () => {
		running = false;
		tools.clear();
		update();
	});

	pi.on("ui_prompt_start", async (event) => {
		prompt = { state: "blocked", kind: PROMPT_KINDS[event.kind], msg: event.title ?? "Waiting for input" };
		update();
	});

	pi.on("ui_prompt_end", async () => {
		prompt = undefined;
		update();
	});

	pi.on("session_shutdown", async (event) => {
		// Other reasons start a new runtime, which reports again on session_start.
		if (enabled && event.reason === "quit") process.stdout.write(formatReport("clear"));
		enabled = false;
	});
}
