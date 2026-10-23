/*
 * Ported from mitsuhiko/agent-stuff:
 * https://github.com/mitsuhiko/agent-stuff/blob/0865c849befd2021490679f96a8dee58c84ac857/extensions/notify.ts
 *
 * Original author: Armin Ronacher (https://github.com/mitsuhiko)
 * License: Apache License 2.0
 * https://github.com/mitsuhiko/agent-stuff/blob/0865c849befd2021490679f96a8dee58c84ac857/LICENSE
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Modified by Michal Vavra: added the /notify command and Pushover delivery.
 */

/**
 * Notification Extension
 *
 * Sends a desktop notification through the terminal when the agent finishes and is
 * waiting for input, and on request pushes the agent's last reply to your phone
 * through Pushover (https://pushover.net/api).
 *
 * Terminal notifications have the title "Pi / <project>" (plus the session name when set),
 * Pushover ones "Pi - <session name>" (or "Pi - <project>" when the session has no name).
 * Both have a short body: the last reply as plain text, cut to 100 characters.
 *
 * Terminal notifications use the OSC 777 escape sequence - no external dependencies.
 * Supported terminals: Ghostty, iTerm2, WezTerm, rxvt-unicode
 * Not supported: Kitty (uses OSC 99), Terminal.app, Windows Terminal, Alacritty
 *
 * Commands:
 *   /notify                  send a terminal notification with the last reply now
 *   /notify pushover         push the last reply to your phone now
 *   /notify pushover setup   prompt for the Pushover user key and app token and save them
 *
 * Settings live in $XDG_CONFIG_HOME/pi-ext-notify.json (~/.config/pi-ext-notify.json), written with mode 0600:
 *   {
 *     "pushover": { "user": "<user key>", "token": "<app token>" }
 *   }
 * A value starting with "!" is run as a shell command and its output is used instead,
 * e.g. "!security find-generic-password -ws pushover-token".
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import {
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Markdown, type MarkdownTheme, stripTerminalSequences } from "@earendil-works/pi-tui";
import { type Static, type TSchema, Type } from "typebox";
import { Value } from "typebox/value";

/** * Send a desktop notification via OSC 777 escape sequence.
 */
const notify = (title: string, body: string): void => {
	// OSC 777 format: ESC ] 777 ; notify ; title ; body BEL
	process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
};

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
	Boolean(part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part);

const extractLastAssistantText = (messages: Array<{ role?: string; content?: unknown }>): string | null => {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message?.role !== "assistant") {
			continue;
		}

		const content = message.content;
		if (typeof content === "string") {
			return content.trim() || null;
		}

		if (Array.isArray(content)) {
			const text = content
				.filter(isTextPart)
				.map((part) => part.text)
				.join("\n")
				.trim();
			return text || null;
		}

		return null;
	}

	return null;
};

const plainMarkdownTheme: MarkdownTheme = {
	heading: (text) => text,
	link: (text) => text,
	linkUrl: () => "",
	code: (text) => text,
	codeBlock: (text) => text,
	codeBlockBorder: () => "",
	quote: (text) => text,
	quoteBorder: () => "",
	hr: () => "",
	listBullet: () => "",
	bold: (text) => text,
	italic: (text) => text,
	strikethrough: (text) => text,
	underline: (text) => text,
};

const simpleMarkdown = (text: string, width = 80): string => {
	const markdown = new Markdown(text, 0, 0, plainMarkdownTheme);
	return markdown.render(width).join("\n");
};

// Banners and lock screens show roughly 50 characters of a title and two short lines of body.
const MAX_TITLE = 50;
const MAX_BODY = 100;

const truncate = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** "Pi / <project>", plus the session name when set, e.g. "Pi / agents / fix login". */
const notificationTitle = (ctx: ExtensionContext): string => {
	const parts = ["Pi", basename(ctx.cwd), ctx.sessionManager.getSessionName()];
	// ";" separates the OSC 777 fields, so it must not appear in the title.
	const title = parts
		.filter(Boolean)
		.join(" / ")
		.replace(/[\x00-\x1f\x7f-\x9f;]/g, " ");
	return truncate(title, MAX_TITLE);
};

/** "Pi - <session name>", or "Pi - <project>" when the session has no name. */
const pushoverTitle = (ctx: ExtensionContext): string =>
	truncate(`Pi - ${ctx.sessionManager.getSessionName() || basename(ctx.cwd)}`, MAX_TITLE);

const formatNotification = (text: string | null, title: string): { title: string; body: string } => {
	const simplified = text ? simpleMarkdown(text) : "";
	// Markdown emits OSC 8 hyperlinks. Embedding one OSC sequence inside the OSC
	// 777 notification terminates the notification early and prints its visible
	// text at the terminal cursor. Remove terminal sequences and remaining control
	// characters before constructing the outer OSC sequence.
	const normalized = stripTerminalSequences(simplified)
		.replace(/[\x00-\x1f\x7f-\x9f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return { title, body: normalized ? truncate(normalized, MAX_BODY) : "Ready for input" };
};

const NotifyConfigSchema = Type.Object({
	pushover: Type.Optional(
		Type.Object({
			user: Type.Optional(Type.String()),
			token: Type.Optional(Type.String()),
		}),
	),
});
type NotifyConfig = Static<typeof NotifyConfigSchema>;

// https://pushover.net/api#response: status is 1 on success, errors lists what went wrong.
const PushoverResponseSchema = Type.Object({
	status: Type.Number(),
	errors: Type.Optional(Type.Array(Type.String())),
});

/** Describe why a value does not match a schema, e.g. "/pushover/user must be string". */
const describeErrors = (schema: TSchema, value: unknown): string =>
	[...Value.Errors(schema, value)].map((error) => `${error.instancePath || "/"} ${error.message}`).join(", ");

const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";

/**
 * $XDG_CONFIG_HOME/pi-ext-notify.json, or ~/.config/... when XDG_CONFIG_HOME is unset or relative
 * (the XDG spec says to ignore relative values).
 */
const configPath = (): string => {
	const xdgConfigHome = process.env.XDG_CONFIG_HOME;
	const configHome = xdgConfigHome && isAbsolute(xdgConfigHome) ? xdgConfigHome : join(homedir(), ".config");
	return join(configHome, "pi-ext-notify.json");
};

/** Load pi-ext-notify.json. A missing file is an empty config; an invalid one throws with the reason. */
const loadConfig = (): NotifyConfig => {
	let raw: string;
	try {
		raw = readFileSync(configPath(), "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw error;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new Error(`Invalid JSON in ${configPath()}: ${(error as Error).message}`);
	}
	if (!Value.Check(NotifyConfigSchema, parsed)) {
		throw new Error(`Invalid ${configPath()}: ${describeErrors(NotifyConfigSchema, parsed)}`);
	}
	return parsed;
};

const saveConfig = (config: NotifyConfig): void => {
	const file = configPath();
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
};

/** Resolve a config value; values starting with "!" are shell commands whose output is the value. */
const resolveValue = (value: string | undefined): string | undefined => {
	if (!value) return undefined;
	if (!value.startsWith("!")) return value.trim() || undefined;
	const output = execSync(value.slice(1), { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10_000 });
	return output.trim() || undefined;
};

const hasPushoverConfig = (config: NotifyConfig): boolean => Boolean(config.pushover?.token && config.pushover?.user);

const sendPushover = async (config: NotifyConfig, title: string, message: string): Promise<void> => {
	const token = resolveValue(config.pushover?.token);
	const user = resolveValue(config.pushover?.user);
	if (!token || !user) {
		throw new Error("Pushover is not configured. Run /notify pushover setup.");
	}

	const response = await fetch(PUSHOVER_URL, {
		method: "POST",
		body: new URLSearchParams({ token, user, title, message }),
		signal: AbortSignal.timeout(10_000),
	});
	const body: unknown = await response.json().catch(() => null);
	const result = Value.Check(PushoverResponseSchema, body) ? body : null;
	if (!response.ok || result?.status !== 1) {
		const reason = result?.errors?.join(", ") || response.statusText || "unexpected response";
		throw new Error(`Pushover request failed (${response.status}): ${reason}`);
	}
};

/** The text of the last assistant message on the current session branch. */
const lastAssistantText = (ctx: ExtensionCommandContext): string | null => {
	const messages = ctx.sessionManager
		.getBranch()
		.flatMap((entry) => (entry.type === "message" ? [entry.message as { role?: string; content?: unknown }] : []));
	return extractLastAssistantText(messages);
};

const setupPushover = async (ctx: ExtensionCommandContext): Promise<void> => {
	if (!ctx.hasUI) {
		ctx.ui.notify(`No UI available. Edit ${configPath()} instead.`, "error");
		return;
	}
	const user = (await ctx.ui.input("Pushover user key", "From your pushover.net dashboard"))?.trim();
	if (!user) return;
	const token = (await ctx.ui.input("Pushover app token", "From your application page on pushover.net"))?.trim();
	if (!token) return;

	const config = loadConfig();
	saveConfig({ ...config, pushover: { ...config.pushover, user, token } });
	ctx.ui.notify(`Saved Pushover settings to ${configPath()}.`, "info");
};

const notifyLastReply = (ctx: ExtensionCommandContext): void => {
	const { title, body } = formatNotification(lastAssistantText(ctx), notificationTitle(ctx));
	notify(title, body);
};

const pushLastReply = async (ctx: ExtensionCommandContext): Promise<void> => {
	const config = loadConfig();
	if (!hasPushoverConfig(config)) {
		ctx.ui.notify("Pushover is not configured. Run /notify pushover setup.", "warning");
		return;
	}
	const { title, body } = formatNotification(lastAssistantText(ctx), pushoverTitle(ctx));
	await sendPushover(config, title, body);
};

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async (event, ctx) => {
		// Escape sequences would end up in the output of print and JSON modes.
		if (!ctx.hasUI) return;
		const lastText = extractLastAssistantText(event.messages ?? []);
		const { title, body } = formatNotification(lastText, notificationTitle(ctx));
		notify(title, body);
	});

	pi.registerCommand("notify", {
		description: "Notify with the agent's last reply (terminal, or pushover)",
		getArgumentCompletions: (prefix) => {
			const options = [
				{ value: "pushover", label: "pushover", description: "Push the last reply via Pushover now" },
				{ value: "pushover setup", label: "pushover setup", description: "Save Pushover user key and app token" },
			];
			return options.filter((option) => option.value.startsWith(prefix.trim()));
		},
		handler: async (args, ctx) => {
			const [channel, subcommand, ...rest] = args.trim().split(/\s+/).filter(Boolean);
			try {
				if (channel === "pushover" && subcommand === "setup" && rest.length === 0) {
					await setupPushover(ctx);
				} else if (channel === "pushover") {
					await pushLastReply(ctx);
				} else {
					notifyLastReply(ctx);
				}
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
