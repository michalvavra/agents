import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import programStatus, { formatReport } from "../agents/pi/extensions/program-status.ts";

const b64 = (text: string) => Buffer.from(text).toString("base64");
const assistant = (fields: object) => ({ role: "assistant", stopReason: "stop", content: [], ...fields });

function setup(t: TestContext, mode = "tui") {
	const handlers = new Map<string, (event: any, ctx: any) => Promise<void>>();
	const output: string[] = [];
	const isTTY = process.stdout.isTTY;
	process.stdout.isTTY = true;
	t.after(() => {
		process.stdout.isTTY = isTTY;
	});
	t.mock.method(process.stdout, "write", (data: string) => output.push(data));
	programStatus({ on: (name: string, handler: any) => handlers.set(name, handler) } as any);
	const emit = (type: string, fields: object = {}) => handlers.get(type)!({ type, ...fields }, { mode });
	return { emit, output };
}

test("formats reports per OSC 7501 syntax", () => {
	assert.equal(formatReport({ state: "idle" }), "\x1b]7501;state=idle:app=pi\x1b\\");
	assert.equal(
		formatReport({ state: "blocked", kind: "permission", msg: "Allow\nrm?" }),
		`\x1b]7501;state=blocked:app=pi:kind=permission:msg=${b64("Allow rm?")}\x1b\\`,
	);
	assert.equal(formatReport("clear"), "\x1b]7501;state=clear\x1b\\");
});

test("reports a run from start to finish", async (t) => {
	const { emit, output } = setup(t);
	await emit("session_start");
	await emit("agent_start");
	await emit("tool_execution_start", { toolCallId: "1", toolName: "bash" });
	await emit("tool_execution_start", { toolCallId: "1/0", toolName: "read", parentToolCallId: "1" });
	await emit("ui_prompt_start", { kind: "confirm", title: "Run it?" });
	await emit("ui_prompt_end", { kind: "confirm" });
	await emit("tool_execution_end", { toolCallId: "1", toolName: "bash" });
	await emit("agent_end", { messages: [assistant({ content: [{ type: "text", text: "## All good\nDetails" }] })] });
	await emit("agent_settled");
	await emit("session_shutdown", { reason: "quit" });

	assert.deepEqual(output, [
		formatReport({ state: "idle" }),
		formatReport({ state: "working" }),
		formatReport({ state: "working", msg: "Running bash" }),
		formatReport({ state: "blocked", kind: "permission", msg: "Run it?" }),
		formatReport({ state: "working", msg: "Running bash" }),
		formatReport({ state: "working" }),
		formatReport({ state: "done", msg: "All good" }),
		formatReport("clear"),
	]);
});

test("reports errors and cancellation", async (t) => {
	const { emit, output } = setup(t);
	await emit("session_start");
	await emit("agent_start");
	await emit("agent_end", { messages: [assistant({ stopReason: "error", errorMessage: "429" })] });
	await emit("agent_settled");
	await emit("agent_start");
	await emit("agent_end", { messages: [assistant({ stopReason: "aborted" })] });
	await emit("agent_settled");

	assert.deepEqual(output.slice(2), [
		formatReport({ state: "error", msg: "429" }),
		formatReport({ state: "working" }),
		formatReport({ state: "idle" }),
	]);
});

test("stays silent outside the TUI", async (t) => {
	const { emit, output } = setup(t, "print");
	await emit("session_start");
	await emit("agent_start");
	assert.deepEqual(output, []);
});
