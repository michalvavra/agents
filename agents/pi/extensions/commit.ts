/**
 * Derived from https://github.com/mitsuhiko/agent-stuff/blob/3e692669366f837c9f8e3bd8f3bc4e691255c5c9/pi-extensions/commit.ts.
 * Copyright 2026 Armin Ronacher.
 * Licensed under the Apache License, Version 2.0.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

const COMMIT_FORMAT_GUIDE = `
Commit message format guidelines:
- Start with a short prefix followed by colon and space (feat:, fix:, docs:, refactor:, test:, chore:, etc.)
- feat: for user-visible features, fix: for bug fixes
- A scope MAY be added in parentheses, e.g. fix(parser): - only when it meaningfully improves clarity
- Short description in imperative mood explaining what changed, not how
- Body MAY be included after one blank line for context, rationale, or non-obvious behavior
- Footers MAY be included (Token: value format, use - instead of spaces in tokens)
- Breaking changes should be explained clearly in description or body, no special marking required
- Clarity and usefulness matter more than strict conformance
`.trim();

export default function commit(pi: ExtensionAPI) {
	pi.registerCommand("commit", {
		description: "Draft and create a git commit with LLM assistance",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("commit requires interactive mode", "error");
				return;
			}

			let mode: string;
			let instruction = args.trim();

			if (instruction) {
				mode = "other";
			} else {
				const selection = await ctx.ui.select("What do you want to commit?", [
					"auto: let the agent figure out what to commit",
					"staged: commit currently staged files",
					"changed: commit all changed files",
					"other: describe what you want to commit",
				]);

				if (!selection) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}

				mode = selection.split(":")[0].trim();

				if (mode === "other") {
					const input = await ctx.ui.input("What do you want to commit?");
					if (!input) {
						ctx.ui.notify("Cancelled", "info");
						return;
					}
					instruction = input;
				}
			}

			let prompt: string;
			switch (mode) {
				case "auto":
					prompt = `Analyze the current git status and changes. Determine what should be committed, stage the appropriate files, and draft a commit message. Use git_commit_with_user_approval to let me review and confirm the commit.

IMPORTANT: Be very selective about what you commit. Only include files that are clearly related to recent work in this session or the task at hand. Do NOT commit:
- Untracked files unless they are clearly part of the current work
- Unrelated local changes that may have been sitting in the working directory
- Configuration files, logs, or other artifacts that should not be in version control

Use conventional commits with breaking changes marked by ! or a BREAKING CHANGE footer.`;
					break;
				case "staged":
					prompt = `Check what files are currently staged (git diff --cached). Draft a commit message for the staged changes. Use git_commit_with_user_approval to let me review and confirm the commit. Do not stage any additional files.

Use conventional commits with breaking changes marked by ! or a BREAKING CHANGE footer.`;
					break;
				case "changed":
					prompt = `Stage all tracked files that have been modified (git add -u) and draft a commit message based on the changes. Use git_commit_with_user_approval to let me review and confirm the commit.

NOTE: This only stages already tracked files that have been modified, not untracked files. This is equivalent to what 'git commit -a' does.

Use conventional commits with breaking changes marked by ! or a BREAKING CHANGE footer.`;
					break;
				case "other":
					prompt = `I want to commit: ${instruction}

Analyze the git status and stage ONLY the files that are directly relevant to this request. Draft a commit message. Use git_commit_with_user_approval to let me review and confirm the commit.

IMPORTANT: Be very conservative about what you include. Only stage files that are clearly related to the requested commit. Do NOT include:
- Unrelated local changes that happen to be in the working directory
- Untracked files unless explicitly part of the request
- Files that seem like they might be leftover from other work

Use conventional commits with breaking changes marked by ! or a BREAKING CHANGE footer.`;
					break;
				default:
					ctx.ui.notify("Unknown mode", "error");
					return;
			}

			pi.sendUserMessage(prompt);
		},
	});

	pi.registerTool({
		name: "git_commit_with_user_approval",
		label: "Git Commit (with approval)",
		description: `Create a git commit with user review and approval. Use this tool when the user should confirm and potentially edit the commit message before committing. For automated commits where no user confirmation is needed, use the regular git commit command via bash instead.

${COMMIT_FORMAT_GUIDE}`,
		parameters: Type.Object({
			message: Type.String({
				description: "Proposed commit message (subject line, optionally followed by blank line and body)",
			}),
			files: Type.Optional(
				Type.Array(Type.String(), {
					description: "Files to stage before committing. If empty or omitted, commits whatever is currently staged.",
				})
			),
		}),

		async execute(_toolCallId, params, _onUpdate, ctx, signal) {
			if (!ctx.hasUI) {
				return {
					content: [{ type: "text", text: "Error: UI not available (running in non-interactive mode)" }],
					details: { committed: false, reason: "no-ui" },
				};
			}

			if (params.files && params.files.length > 0) {
				const stageResult = await pi.exec("git", ["add", "--", ...params.files], { signal });
				if (stageResult.code !== 0) {
					return {
						content: [{ type: "text", text: `Error staging files: ${stageResult.stderr}` }],
						details: { committed: false, reason: "stage-failed", error: stageResult.stderr },
					};
				}
			}

			const statusResult = await pi.exec("git", ["diff", "--cached", "--quiet"], { signal });
			if (statusResult.code === 0) {
				return {
					content: [{ type: "text", text: "Nothing staged to commit" }],
					details: { committed: false, reason: "nothing-staged" },
				};
			}

			const diffStatResult = await pi.exec("git", ["diff", "--cached", "--stat"], { signal });
			const stagedInfo = diffStatResult.stdout.trim();

			const editorPrompt = `Staged changes:\n${stagedInfo}\n\n───────────────────────────────────────\nEdit commit message (save to commit, cancel to abort):`;
			const finalMessage = await ctx.ui.editor(editorPrompt, params.message);

			if (finalMessage === undefined || finalMessage.trim() === "") {
				return {
					content: [{ type: "text", text: "Commit cancelled by user" }],
					details: { committed: false, reason: "user-cancelled" },
				};
			}

			const commitResult = await pi.exec("git", ["commit", "-m", finalMessage.trim()], { signal });

			if (commitResult.code !== 0) {
				return {
					content: [{ type: "text", text: `Commit failed: ${commitResult.stderr}` }],
					details: { committed: false, reason: "commit-failed", error: commitResult.stderr },
				};
			}

			const hashResult = await pi.exec("git", ["rev-parse", "--short", "HEAD"], { signal });
			const commitHash = hashResult.stdout.trim();

			return {
				content: [
					{
						type: "text",
						text: `Committed ${commitHash}: ${finalMessage.trim().split("\n")[0]}`,
					},
				],
				details: {
					committed: true,
					hash: commitHash,
					message: finalMessage.trim(),
					files: params.files || [],
				},
			};
		},

		renderCall(args, theme) {
			const message = (args.message as string) || "";
			const subject = message.split("\n")[0];
			const files = (args.files as string[]) || [];

			let text = theme.fg("toolTitle", theme.bold("git commit "));
			text += theme.fg("muted", `"${subject}"`);
			if (files.length > 0) {
				text += theme.fg("dim", ` (${files.length} file${files.length !== 1 ? "s" : ""})`);
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as
				| { committed: boolean; reason?: string; hash?: string; message?: string; error?: string }
				| undefined;

			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (!details.committed) {
				const reason = details.reason || "unknown";
				if (reason === "user-cancelled") {
					return new Text(theme.fg("warning", "Cancelled"), 0, 0);
				}
				if (reason === "nothing-staged") {
					return new Text(theme.fg("warning", "Nothing to commit"), 0, 0);
				}
				return new Text(theme.fg("error", `Failed: ${details.error || reason}`), 0, 0);
			}

			const subject = (details.message || "").split("\n")[0];
			return new Text(
				theme.fg("success", "✓ ") + theme.fg("accent", details.hash || "") + theme.fg("muted", ` ${subject}`),
				0,
				0
			);
		},
	});
}
