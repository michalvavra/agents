/*
 * Google Workspace for pi. /google-workspace signs in to a Google account and the
 * google_workspace tool calls Google APIs (*.googleapis.com) as a connected account.
 *
 * Two sign-in modes:
 * - "broker" (default): OAuth through the Radius broker (radius.pi.dev), the same flow
 *   as @earendil-works/pi-radius-work. No setup needed; tokens refresh through the broker.
 * - "pkce": your own Google OAuth "Desktop app" client, for accounts listed in
 *   ~/.pi/google-workspace/config.json. Tokens refresh directly against Google.
 * See README.md for the config format.
 *
 * Sign-in also works from another device: open the printed URL anywhere, then paste the
 * localhost URL the browser ends on (it does not load there) back into pi.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { StringEnum } from "@earendil-works/pi-ai";
import {
	copyToClipboard,
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const STATUS_KEY = "google-workspace";

const BASE_DIR = path.join(os.homedir(), ".pi", "google-workspace");
const TOKENS_DIR = process.env.GOOGLE_WORKSPACE_TOKENS_DIR || path.join(BASE_DIR, "tokens");
const CONFIG_PATH = process.env.GOOGLE_WORKSPACE_CONFIG || path.join(BASE_DIR, "config.json");

const BROKER_BASE_URL = process.env.GOOGLE_WORKSPACE_BROKER_URL || "https://radius.pi.dev/v1/oauth/google-workspaces";
const CALLBACK_HOST = process.env.GOOGLE_WORKSPACE_CALLBACK_HOST || "localhost";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

// Same scopes the Radius broker requests.
const DEFAULT_SCOPES = [
	"openid",
	"email",
	"profile",
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/calendar",
	"https://www.googleapis.com/auth/drive",
	"https://www.googleapis.com/auth/documents",
	"https://www.googleapis.com/auth/spreadsheets",
	"https://www.googleapis.com/auth/presentations",
	"https://www.googleapis.com/auth/contacts.readonly",
	"https://www.googleapis.com/auth/meetings.space.readonly",
	"https://www.googleapis.com/auth/meetings.space.settings",
];

// Long enough to finish sign-in on another device and paste the redirect URL back.
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;
const TOKEN_REQUEST_TIMEOUT_MS = 15 * 1000;
const API_REQUEST_TIMEOUT_MS = 60 * 1000;
// Refresh the access token before an API call when it expires within this window.
const REFRESH_BEFORE_CALL_MS = 2 * 60 * 1000;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+$/;

type TokenPayload = {
	access_token: string;
	refresh_token?: string | null;
	expiry_date: number;
	scope?: string;
	token_type?: string;
	__authMode: "broker" | "pkce";
	__email: string;
	// pkce only
	__clientId?: string;
	__clientSecret?: string;
};

type Connection = { email: string; tokenPath: string; token: TokenPayload };

type AccountConfig = {
	email: string;
	client_id?: string;
	client_secret?: string;
	scopes?: string[];
};

type LoadedConfig = { accounts: AccountConfig[]; error?: string };

type TokenEndpointResponse = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number | string;
	expiry_date?: number;
	scope?: string;
	token_type?: string;
	id_token?: string;
	error?: string | { message?: string };
	error_description?: string;
};

type LoginResult = { email: string; tokenPath: string };

/** Asks for the pasted redirect URL; resolves undefined when the user dismissed the prompt. */
type PromptForRedirectUrl = (signal: AbortSignal, previousInputInvalid: boolean) => Promise<string | undefined>;

class SignInCancelledError extends Error {
	constructor() {
		super("Google Workspace authentication cancelled.");
	}
}

type ExtensionState = { loginController?: AbortController; shuttingDown: boolean };

const API_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

const GoogleWorkspaceParams = Type.Object({
	url: Type.String({
		description:
			'Full Google API URL on *.googleapis.com, e.g. "https://gmail.googleapis.com/gmail/v1/users/me/messages", ' +
			'"https://www.googleapis.com/calendar/v3/calendars/primary/events", "https://www.googleapis.com/drive/v3/files", ' +
			'"https://sheets.googleapis.com/v4/spreadsheets/{id}/values/A1:D20", "https://docs.googleapis.com/v1/documents/{id}", ' +
			'"https://people.googleapis.com/v1/people/me/connections".',
	}),
	method: Type.Optional(StringEnum(API_METHODS, { description: "HTTP method (default GET)" })),
	account: Type.Optional(
		Type.String({ description: "Connected account email. Required when more than one account is connected." }),
	),
	query: Type.Optional(
		Type.Record(Type.String(), Type.Union([Type.String(), Type.Array(Type.String())]), {
			description:
				'Query parameters, e.g. {"maxResults": "10", "q": "is:unread", "fields": "messages(id)"}. ' +
				'Arrays repeat the parameter, e.g. {"metadataHeaders": ["From", "Subject"]}.',
		}),
	),
	body: Type.Optional(Type.Any({ description: "Request body. Objects are sent as JSON." })),
	headers: Type.Optional(
		Type.Record(Type.String(), Type.String(), {
			description: "Extra request headers. Authorization is set automatically.",
		}),
	),
});

type GoogleWorkspaceInput = Static<typeof GoogleWorkspaceParams>;

const GoogleWorkspaceOutput = Type.Object({
	account: Type.String(),
	status: Type.Number(),
	headers: Type.Record(Type.String(), Type.String()),
	bodyEncoding: StringEnum(["json", "text", "base64", "empty"] as const),
	body: Type.Any(),
});

type ApiResult = Static<typeof GoogleWorkspaceOutput>;

// One in-flight refresh per account, so parallel API calls share it (per process).
const refreshesInFlight = new Map<string, Promise<TokenPayload>>();

export default function googleWorkspaceExtension(pi: ExtensionAPI) {
	const state: ExtensionState = { shuttingDown: false };

	pi.on("session_start", (_event, ctx) => {
		updateStatusLine(ctx.ui);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		state.shuttingDown = true;
		state.loginController?.abort();
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});

	pi.on("before_agent_start", (event) => {
		const connections = listConnections();
		if (connections.length === 0) {
			return {
				systemPrompt:
					event.systemPrompt +
					"\n\nGoogle Workspace: no locally connected accounts were found. If the user asks for Gmail, Google Calendar, Drive, Docs, Sheets, Slides, Contacts, or Meet access, ask them to run /google-workspace first.",
			};
		}

		const lines = connections.map((connection) => `- ${connection.email}`);
		return {
			systemPrompt:
				event.systemPrompt +
				"\n\nGoogle Workspace local connections:\n" +
				`${lines.join("\n")}\n` +
				"When the user asks for Google Workspace data (Gmail, Calendar, Drive, Docs, Sheets, Slides, Contacts, Meet) for a specific email account, use the matching connected account above with the google_workspace tool. " +
				"The tool handles credentials; do not read token files or expose token values. If they do not specify an account and exactly one account is connected, use it by default; otherwise ask which account.",
		};
	});

	pi.registerTool({
		name: "google_workspace",
		label: "Google Workspace",
		description:
			"Call Google Workspace REST APIs (any https://*.googleapis.com URL: Gmail, Calendar, Drive, Docs, Sheets, Slides, People, Meet) as a connected Google account. " +
			"Authentication and token refresh are handled automatically. " +
			"Returns { account, status, headers, bodyEncoding, body }; JSON responses are parsed into body. " +
			`The text shown to the model is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; the full body is then saved to a temp file. ` +
			"Follow paging by passing body.nextPageToken as query.pageToken.",
		promptSnippet: "Call Google Workspace APIs (Gmail, Calendar, Drive, Docs, Sheets) as a connected account",
		promptGuidelines: [
			"Use the fields and maxResults/pageSize query parameters to keep google_workspace responses small.",
			"In codemode, batch independent google_workspace calls with Promise.all and filter results in the script.",
			"Ask before sending mail, or creating, changing or deleting data, unless the user asked for it explicitly.",
		],
		parameters: GoogleWorkspaceParams,
		outputSchema: GoogleWorkspaceOutput,
		executionMode: "parallel",

		async execute(_toolCallId, params, signal) {
			const result = await callGoogleApi(params, signal);
			const { text, fullOutputPath } = await formatApiResultForModel(result, params);
			return {
				content: [{ type: "text", text }],
				details: { account: result.account, status: result.status, fullOutputPath },
				structuredContent: result,
				isError: result.status < 200 || result.status >= 300,
			};
		},
	});

	pi.registerCommand("google-workspace", {
		description:
			"Connect a Google Workspace account (/google-workspace [email]), or run /google-workspace status|logout|refresh",
		getArgumentCompletions: listCommandCompletions,
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const [subcommand = "", ...rest] = String(args || "")
				.trim()
				.split(/\s+/)
				.filter(Boolean);

			switch (subcommand.toLowerCase()) {
				case "status":
				case "list":
					ctx.ui.setEditorText(formatStatusMessage());
					ctx.ui.notify("Google Workspace status loaded", "info");
					break;
				case "logout":
				case "remove":
					await runLogoutCommand(rest[0], ctx);
					break;
				case "refresh":
					await runRefreshCommand(ctx);
					break;
				default:
					await runLoginCommand(subcommand, ctx, state);
			}

			if (!state.shuttingDown) {
				updateStatusLine(ctx.ui);
			}
		},
	});
}

// ---------------------------------------------------------------------------
// API calls

async function callGoogleApi(params: GoogleWorkspaceInput, signal: AbortSignal | undefined): Promise<ApiResult> {
	const email = resolveToolAccount(params.account, listConnections());
	const url = buildApiUrl(params.url, params.query);
	const method = params.method || "GET";

	const headers: Record<string, string> = {};
	for (const [key, value] of Object.entries(params.headers || {})) {
		if (key.toLowerCase() === "authorization") continue;
		headers[key] = value;
	}

	let body: string | undefined;
	if (params.body !== undefined && params.body !== null && method !== "GET") {
		const isText = typeof params.body === "string";
		body = isText ? params.body : JSON.stringify(params.body);
		if (!hasHeader(headers, "content-type")) {
			headers["Content-Type"] = isText ? "text/plain" : "application/json";
		}
	}

	const send = (token: TokenPayload) =>
		fetch(url, {
			method,
			headers: { ...headers, Authorization: `Bearer ${token.access_token}` },
			body,
			signal: withTimeout(signal, API_REQUEST_TIMEOUT_MS),
		});

	let response = await send(await getValidToken(email));
	if (response.status === 401) {
		// Access token revoked or expired early; refresh once and retry.
		await response.body?.cancel();
		response = await send(await forceRefreshToken(email));
	}

	return readApiResponse(email, response);
}

function resolveToolAccount(requested: string | undefined, connections: Connection[]): string {
	if (connections.length === 0) {
		throw new Error("no Google Workspace accounts connected; ask the user to run /google-workspace");
	}
	const available = connections.map((connection) => connection.email).join(", ");

	if (requested) {
		const email = normalizeEmail(requested);
		if (!connections.some((connection) => connection.email === email)) {
			throw new Error(`${email} is not connected (connected: ${available}); ask the user to run /google-workspace`);
		}
		return email;
	}

	if (connections.length === 1) return connections[0].email;
	throw new Error(`several accounts are connected; pass account (one of: ${available})`);
}

function buildApiUrl(rawUrl: string, query: Record<string, string | string[]> | undefined): URL {
	const trimmed = String(rawUrl || "").trim();
	if (!trimmed) throw new Error("url is required");

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		throw new Error(`url must be a full https://*.googleapis.com URL (got ${trimmed})`);
	}
	// Only Google API hosts receive the token. Downloads may redirect to other hosts
	// (e.g. googleusercontent.com); fetch drops Authorization on cross-origin redirects.
	if (url.protocol !== "https:" || !url.hostname.endsWith(".googleapis.com")) {
		throw new Error(`only https://*.googleapis.com URLs are allowed (got ${url.origin})`);
	}

	for (const [key, value] of Object.entries(query || {})) {
		url.searchParams.delete(key);
		for (const item of Array.isArray(value) ? value : [value]) {
			url.searchParams.append(key, item);
		}
	}
	return url;
}

async function readApiResponse(account: string, response: Response): Promise<ApiResult> {
	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});

	const base = { account, status: response.status, headers };
	const contentType = (response.headers.get("content-type") || "").toLowerCase();
	const buffer = Buffer.from(await response.arrayBuffer());

	if (buffer.length === 0) {
		return { ...base, bodyEncoding: "empty", body: null };
	}
	if (contentType.includes("json")) {
		const text = buffer.toString("utf8");
		try {
			return { ...base, bodyEncoding: "json", body: JSON.parse(text) };
		} catch {
			return { ...base, bodyEncoding: "text", body: text };
		}
	}
	if (contentType.startsWith("text/") || contentType.includes("xml") || contentType.includes("csv")) {
		return { ...base, bodyEncoding: "text", body: buffer.toString("utf8") };
	}
	return { ...base, bodyEncoding: "base64", body: buffer.toString("base64") };
}

async function formatApiResultForModel(
	result: ApiResult,
	params: GoogleWorkspaceInput,
): Promise<{ text: string; fullOutputPath?: string }> {
	const header = `${params.method || "GET"} ${params.url} -> HTTP ${result.status} (${result.account})`;
	const body = formatApiBody(result);
	const truncation = truncateHead(body, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
	if (!truncation.truncated) {
		return { text: `${header}\n${body}` };
	}

	const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-google-workspace-"));
	const fullOutputPath = path.join(tempDir, "body.txt");
	await fs.promises.writeFile(fullOutputPath, body, { encoding: "utf8", mode: 0o600 });

	const notice =
		`[Body truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines ` +
		`(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
		`Full body saved to ${fullOutputPath}. Use fields/maxResults to request less.]`;
	return { text: `${header}\n${truncation.content}\n\n${notice}`, fullOutputPath };
}

function formatApiBody(result: ApiResult): string {
	switch (result.bodyEncoding) {
		case "empty":
			return "(empty body)";
		case "base64": {
			const bytes = Math.floor((String(result.body).length * 3) / 4);
			const type = result.headers["content-type"] || "unknown type";
			return `(binary body, ${type}, ~${bytes} bytes; use codemode to access body as base64)`;
		}
		case "json":
			return JSON.stringify(result.body, null, 2);
		case "text":
			return String(result.body);
	}
}

// ---------------------------------------------------------------------------
// Commands and status

function listCommandCompletions(prefix: string) {
	const options = [
		{ value: "status", label: "status", description: "List connected accounts" },
		{ value: "refresh", label: "refresh", description: "Refresh access tokens now" },
		...loadConfig().accounts.map((account) => ({
			value: account.email,
			label: account.email,
			description: "Sign in (own OAuth client)",
		})),
		...listConnections().map((connection) => ({
			value: `logout ${connection.email}`,
			label: `logout ${connection.email}`,
			description: "Remove the stored token",
		})),
	];
	const filtered = options.filter((option) => option.value.startsWith(prefix.trim()));
	return filtered.length > 0 ? filtered : null;
}

function formatStatusMessage(): string {
	const connections = listConnections();
	const config = loadConfig();
	const connectedEmails = new Set(connections.map((connection) => connection.email));
	const notSignedIn = config.accounts.map((account) => account.email).filter((email) => !connectedEmails.has(email));

	const summary =
		connections.length === 0
			? "Google Workspace: not connected"
			: `Google Workspace: connected (${connections.length} account${connections.length === 1 ? "" : "s"})`;

	return [
		summary,
		`Tokens directory: ${TOKENS_DIR}`,
		`Config: ${CONFIG_PATH}`,
		...(config.error ? [`Config error: ${config.error}`] : []),
		...connections.map(
			(connection) =>
				`- ${connection.email} [${connection.token.__authMode}]: ${connection.tokenPath} (${formatExpiry(connection.token)})`,
		),
		...(notSignedIn.length > 0 ? [`Configured, not signed in: ${notSignedIn.join(", ")}`] : []),
		...(connections.length === 0 ? ["Run /google-workspace [email] to connect an account."] : []),
	].join("\n");
}

function formatExpiry(token: TokenPayload): string {
	if (!token.expiry_date) return "unknown expiry";
	if (token.expiry_date <= Date.now()) return "access token expired (refreshes on next use)";
	return `access token valid until ${new Date(token.expiry_date).toLocaleString()}`;
}

function updateStatusLine(ui: Pick<ExtensionUIContext, "setStatus">): void {
	const connections = listConnections();
	if (connections.length === 0) {
		ui.setStatus(STATUS_KEY, "Google Workspace: not connected");
		return;
	}

	if (connections.length === 1) {
		ui.setStatus(STATUS_KEY, `Google Workspace: ${connections[0].email}`);
		return;
	}

	ui.setStatus(STATUS_KEY, `Google Workspace: ${connections.length} accounts connected`);
}

async function runLogoutCommand(emailArg: string | undefined, ctx: ExtensionCommandContext): Promise<void> {
	const connections = listConnections();
	if (connections.length === 0) {
		ctx.ui.notify("Google Workspace: no connected accounts", "info");
		return;
	}

	let email = emailArg ? normalizeEmail(emailArg) : undefined;
	if (!email && connections.length === 1) {
		email = connections[0].email;
	} else if (!email && ctx.hasUI) {
		email = await ctx.ui.select(
			"Log out of which Google Workspace account?",
			connections.map((connection) => connection.email),
		);
	}
	if (!email) {
		ctx.ui.notify("Usage: /google-workspace logout you@gmail.com", "warning");
		return;
	}

	const connection = connections.find((entry) => entry.email === email);
	if (!connection) {
		ctx.ui.notify(`Google Workspace: ${email} is not connected`, "warning");
		return;
	}

	fs.rmSync(connection.tokenPath, { force: true });
	ctx.ui.notify(`Removed Google Workspace account: ${email}`, "info");
}

async function runRefreshCommand(ctx: ExtensionCommandContext): Promise<void> {
	const connections = listConnections();
	if (connections.length === 0) {
		ctx.ui.notify("Google Workspace: no connected accounts", "info");
		return;
	}

	const results = await Promise.allSettled(connections.map((connection) => forceRefreshToken(connection.email)));
	const errors = results.flatMap((result, index) =>
		result.status === "rejected" ? [`- ${connections[index].email}: ${errorMessage(result.reason)}`] : [],
	);

	if (errors.length > 0) {
		ctx.ui.notify(`Google Workspace refresh failed:\n${errors.join("\n")}`, "error");
	} else {
		ctx.ui.notify("Google Workspace tokens refreshed", "info");
	}
}

const BROKER_CHOICE = "Another Google account (Radius broker)";

async function runLoginCommand(emailArg: string, ctx: ExtensionCommandContext, state: ExtensionState): Promise<void> {
	if (state.loginController) {
		ctx.ui.notify("Google Workspace sign-in is already in progress", "warning");
		return;
	}

	const controller = new AbortController();
	state.loginController = controller;

	try {
		const account = await resolveLoginAccount(emailArg, ctx);
		if (account === null) {
			ctx.ui.notify("Google Workspace sign-in cancelled", "info");
			return;
		}
		const label = account ? account.email : "Radius broker";

		ctx.ui.setStatus(STATUS_KEY, `Waiting for Google Workspace sign-in (${label})...`);
		const promptForRedirectUrl = ctx.hasUI ? createRedirectUrlPrompt(ctx.ui, label, ctx.mode === "tui") : undefined;
		const result = await loginGoogleAccount(account, controller.signal, promptForRedirectUrl);

		if (state.shuttingDown) {
			return;
		}

		ctx.ui.notify(`Connected Google Workspace account: ${result.email}\nToken: ${result.tokenPath}`, "info");
	} catch (error) {
		if (state.shuttingDown) {
			return;
		}
		if (error instanceof SignInCancelledError) {
			ctx.ui.notify("Google Workspace sign-in cancelled", "info");
		} else {
			ctx.ui.notify(`Google Workspace login failed: ${errorMessage(error)}`, "error");
		}
	} finally {
		if (state.loginController === controller) {
			state.loginController = undefined;
		}
	}
}

/**
 * Returns the configured account to sign in with your own OAuth client, undefined for the
 * Radius broker, or null when the user cancelled the picker.
 */
async function resolveLoginAccount(
	arg: string,
	ctx: ExtensionCommandContext,
): Promise<AccountConfig | undefined | null> {
	const config = loadConfig();
	if (config.error) {
		throw new Error(config.error);
	}
	const configured = config.accounts.filter((account) => account.client_id);

	if (arg) {
		const email = normalizeEmail(arg);
		// Unconfigured emails go through the broker; the account is picked in the browser.
		return configured.find((account) => account.email === email);
	}

	if (configured.length === 0 || !ctx.hasUI) {
		return undefined;
	}

	const connected = new Set(listConnections().map((connection) => connection.email));
	const labels = configured.map((account) =>
		connected.has(account.email) ? `${account.email} (connected)` : account.email,
	);
	const choice = await ctx.ui.select("Sign in to which Google account?", [...labels, BROKER_CHOICE]);
	if (!choice) return null;
	if (choice === BROKER_CHOICE) return undefined;
	return configured[labels.indexOf(choice)];
}

/**
 * Prints the sign-in URL and waits for a pasted redirect URL, so sign-in works from another
 * device: the browser there ends on a localhost page that cannot reach this machine.
 */
function createRedirectUrlPrompt(
	ui: ExtensionUIContext,
	label: string,
	copyUrl: boolean,
): (startUrl: string) => PromptForRedirectUrl {
	return (startUrl) => async (signal, previousInputInvalid) => {
		if (previousInputInvalid) {
			ui.notify("That is not a sign-in redirect URL. Paste the full URL from the browser's address bar.", "warning");
		} else {
			const copied =
				copyUrl &&
				(await copyToClipboard(startUrl).then(
					() => true,
					() => false,
				));
			ui.notify(
				`Google Workspace sign-in (${label})${copied ? ", URL copied to clipboard" : ""}:\n${startUrl}\n\n` +
					"Signing in on another device? The browser ends on a localhost page that does not load. " +
					"Copy that page's URL from the address bar and paste it here.",
				"info",
			);
		}
		return ui.input("Waiting for Google sign-in. Paste the redirect URL from another device:", "http://localhost:…", {
			signal,
		});
	};
}

// ---------------------------------------------------------------------------
// Sign-in

async function loginGoogleAccount(
	account: AccountConfig | undefined,
	signal: AbortSignal,
	promptForRedirectUrl?: (startUrl: string) => PromptForRedirectUrl,
): Promise<LoginResult> {
	const token = account
		? await loginWithOwnClient(account, signal, promptForRedirectUrl)
		: await loginWithBroker(signal, promptForRedirectUrl);
	const tokenPath = writeToken(token);
	return { email: token.__email, tokenPath };
}

async function loginWithBroker(
	signal: AbortSignal,
	promptForRedirectUrl?: (startUrl: string) => PromptForRedirectUrl,
): Promise<TokenPayload> {
	const port = await getAvailablePort();
	const callbackPath = "/oauth2callback";
	const startUrl = new URL(`${BROKER_BASE_URL}/start`);
	startUrl.searchParams.set("return_to", `http://${CALLBACK_HOST}:${port}${callbackPath}`);

	const params = await waitForOAuthRedirect({
		port,
		callbackPath,
		startUrl: startUrl.toString(),
		signal,
		promptForRedirectUrl: promptForRedirectUrl?.(startUrl.toString()),
	});

	const email = params.get("email");
	const accessToken = params.get("access_token");
	const expiryDate = Number.parseInt(params.get("expiry_date") || "", 10);
	if (!email || !accessToken || Number.isNaN(expiryDate)) {
		throw new Error("Authentication failed: broker callback did not include email, access token and expiry.");
	}

	return {
		access_token: accessToken,
		refresh_token: params.get("refresh_token") || null,
		expiry_date: expiryDate,
		scope: params.get("scope") || undefined,
		token_type: params.get("token_type") || undefined,
		__authMode: "broker",
		__email: normalizeEmail(email),
	};
}

async function loginWithOwnClient(
	account: AccountConfig,
	signal: AbortSignal,
	promptForRedirectUrl?: (startUrl: string) => PromptForRedirectUrl,
): Promise<TokenPayload> {
	const clientId = account.client_id as string;
	const clientSecret = account.client_secret;
	const scopes = account.scopes?.length ? [...account.scopes] : [...DEFAULT_SCOPES];
	for (const required of ["openid", "email"]) {
		if (!scopes.includes(required)) scopes.unshift(required);
	}

	const port = await getAvailablePort();
	const callbackPath = "/oauth2callback";
	// Google Desktop clients accept any loopback port without registering it.
	const redirectUri = `http://127.0.0.1:${port}${callbackPath}`;

	const codeVerifier = crypto.randomBytes(32).toString("base64url");
	const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
	const state = crypto.randomBytes(16).toString("base64url");

	const authorizeUrl = new URL(GOOGLE_AUTHORIZE_URL);
	authorizeUrl.searchParams.set("client_id", clientId);
	authorizeUrl.searchParams.set("redirect_uri", redirectUri);
	authorizeUrl.searchParams.set("response_type", "code");
	authorizeUrl.searchParams.set("scope", scopes.join(" "));
	authorizeUrl.searchParams.set("state", state);
	authorizeUrl.searchParams.set("code_challenge", codeChallenge);
	authorizeUrl.searchParams.set("code_challenge_method", "S256");
	authorizeUrl.searchParams.set("access_type", "offline");
	authorizeUrl.searchParams.set("prompt", "consent");
	authorizeUrl.searchParams.set("login_hint", account.email);

	const params = await waitForOAuthRedirect({
		port,
		host: "127.0.0.1",
		callbackPath,
		startUrl: authorizeUrl.toString(),
		state,
		signal,
		promptForRedirectUrl: promptForRedirectUrl?.(authorizeUrl.toString()),
	});
	const code = params.get("code");
	if (!code) {
		throw new Error("Authentication failed: callback did not include an authorization code.");
	}

	const response = await requestGoogleToken(
		{
			grant_type: "authorization_code",
			client_id: clientId,
			...(clientSecret ? { client_secret: clientSecret } : {}),
			code,
			code_verifier: codeVerifier,
			redirect_uri: redirectUri,
		},
		signal,
	);

	// Store under the account Google actually signed in, not the configured one.
	const email = await fetchSignedInEmail(response.access_token, signal);
	if (email !== account.email) {
		throw new Error(
			`Signed in as ${email}, but ${account.email} was requested. Pick ${account.email} in the browser.`,
		);
	}

	return {
		access_token: response.access_token,
		refresh_token: response.refresh_token || null,
		expiry_date: expiryFromResponse(response),
		scope: response.scope || undefined,
		token_type: response.token_type || undefined,
		__authMode: "pkce",
		__email: email,
		__clientId: clientId,
		__clientSecret: clientSecret,
	};
}

async function fetchSignedInEmail(accessToken: string, signal: AbortSignal): Promise<string> {
	const response = await fetch(GOOGLE_USERINFO_URL, {
		headers: { Authorization: `Bearer ${accessToken}` },
		signal: withTimeout(signal, TOKEN_REQUEST_TIMEOUT_MS),
	});
	const payload = (await response.json().catch(() => ({}))) as { email?: string };
	if (!response.ok || !payload.email) {
		throw new Error(`Could not read the signed-in email (HTTP ${response.status}); include the "email" scope.`);
	}
	return normalizeEmail(payload.email);
}

/**
 * Resolves with the OAuth redirect query, from whichever arrives first: the browser hitting
 * the local callback server, or the redirect URL pasted into promptForRedirectUrl (sign-in
 * on another device).
 */
async function waitForOAuthRedirect(input: {
	port: number;
	host?: string;
	callbackPath: string;
	startUrl: string;
	state?: string;
	signal: AbortSignal;
	promptForRedirectUrl?: PromptForRedirectUrl;
}): Promise<URLSearchParams> {
	const { port, callbackPath, startUrl, state, signal, promptForRedirectUrl } = input;
	const host = input.host || CALLBACK_HOST;
	if (signal.aborted) {
		throw new SignInCancelledError();
	}

	return new Promise<URLSearchParams>((resolve, reject) => {
		let settled = false;
		const promptController = new AbortController();
		const timer = setTimeout(
			() =>
				finish(new Error(`Authentication timed out after ${LOGIN_TIMEOUT_MS / 60_000} minutes. Please try again.`)),
			LOGIN_TIMEOUT_MS,
		);

		const finish = (error?: Error, params?: URLSearchParams) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			promptController.abort();
			if (server.listening) server.close();
			if (error) reject(error);
			else resolve(params as URLSearchParams);
		};

		const server = http.createServer((req, res) => {
			try {
				const parsed = new URL(req.url || "/", `http://${host}:${port}`);
				if (parsed.pathname !== callbackPath) {
					res.statusCode = 404;
					res.end("Not found");
					return;
				}

				const error = checkRedirectParams(parsed.searchParams, state);
				if (error) {
					res.statusCode = 400;
					res.end("Authentication failed.");
					finish(error);
					return;
				}

				res.end("Authentication successful. You can close this tab.");
				finish(undefined, parsed.searchParams);
			} catch (error) {
				finish(error instanceof Error ? error : new Error(String(error)));
			}
		});

		const waitForPastedRedirect = async (prompt: PromptForRedirectUrl) => {
			let previousInputInvalid = false;
			while (!settled) {
				const pasted = await prompt(promptController.signal, previousInputInvalid);
				if (settled) return;
				if (pasted === undefined) {
					finish(new SignInCancelledError());
					return;
				}
				const params = parseRedirectInput(pasted);
				if (!params.has("code") && !params.has("access_token") && !params.has("error")) {
					previousInputInvalid = true;
					continue;
				}
				finish(checkRedirectParams(params, state), params);
			}
		};

		signal.addEventListener("abort", () => finish(new SignInCancelledError()), { once: true });

		server.on("error", (error: Error) => {
			finish(new Error(`OAuth callback server error: ${error.message}`));
		});

		server.listen(port, host, () => {
			openUrlInBrowser(startUrl, (error) => {
				// With a paste prompt the URL is already shown, so sign-in can continue elsewhere.
				if (promptForRedirectUrl) return;
				finish(new Error(`Could not open the browser (${error.message}). Open this URL manually:\n${startUrl}`));
			});
			if (promptForRedirectUrl) {
				waitForPastedRedirect(promptForRedirectUrl).catch((error: unknown) =>
					finish(error instanceof Error ? error : new Error(String(error))),
				);
			}
		});
	});
}

/** Returns the error an OAuth redirect reports (OAuth error or state mismatch), if any. */
function checkRedirectParams(params: URLSearchParams, state: string | undefined): Error | undefined {
	const errorCode = params.get("error");
	if (errorCode) {
		const description = params.get("error_description") || "No additional details";
		return new Error(`Google OAuth error: ${errorCode}. ${description}`);
	}
	if (state !== undefined && params.get("state") !== state) {
		return new Error("Authentication failed: OAuth state mismatch.");
	}
	return undefined;
}

/** Reads the query from a pasted redirect URL; a bare query string ("code=…&state=…") also works. */
function parseRedirectInput(pasted: string): URLSearchParams {
	const value = pasted.trim();
	try {
		return new URL(value).searchParams;
	} catch {
		return new URLSearchParams(value.slice(value.indexOf("?") + 1));
	}
}

function getAvailablePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.listen(0, () => {
			const address = server.address();
			const port = address && typeof address === "object" ? address.port : 0;
			server.close(() => resolve(port));
		});
		server.on("error", reject);
	});
}

function openUrlInBrowser(targetUrl: string, onError: (error: Error) => void): void {
	let command: string;
	let args: string[];

	if (process.platform === "darwin") {
		command = "open";
		args = [targetUrl];
	} else if (process.platform === "win32") {
		command = "cmd";
		args = ["/c", "start", "", targetUrl];
	} else {
		command = "xdg-open";
		args = [targetUrl];
	}

	// A missing command (ENOENT) is reported through the "error" event, not thrown.
	try {
		const child = spawn(command, args, { detached: true, stdio: "ignore" });
		child.on("error", onError);
		child.unref();
	} catch (error) {
		onError(error instanceof Error ? error : new Error(String(error)));
	}
}

// ---------------------------------------------------------------------------
// Tokens

async function getValidToken(email: string): Promise<TokenPayload> {
	const token = readAccountToken(email);
	if (token.expiry_date - Date.now() > REFRESH_BEFORE_CALL_MS) {
		return token;
	}
	return refreshTokenOnce(token);
}

async function forceRefreshToken(email: string): Promise<TokenPayload> {
	return refreshTokenOnce(readAccountToken(email));
}

function readAccountToken(email: string): TokenPayload {
	const token = readToken(tokenPathForEmail(email));
	if (!token) {
		throw new Error(`no token for ${email}; ask the user to run /google-workspace ${email}`);
	}
	return token;
}

function refreshTokenOnce(token: TokenPayload): Promise<TokenPayload> {
	const existing = refreshesInFlight.get(token.__email);
	if (existing) return existing;
	const refresh = refreshToken(token).finally(() => refreshesInFlight.delete(token.__email));
	refreshesInFlight.set(token.__email, refresh);
	return refresh;
}

async function refreshToken(token: TokenPayload): Promise<TokenPayload> {
	const signInAgain = `run /google-workspace ${token.__email} to sign in again`;
	if (!token.refresh_token) {
		throw new Error(`no refresh token stored; ${signInAgain}`);
	}

	let response: TokenEndpointResponse & { access_token: string };
	try {
		if (token.__authMode === "pkce") {
			if (!token.__clientId) throw new Error(`token has no client id; ${signInAgain}`);
			response = await requestGoogleToken({
				grant_type: "refresh_token",
				client_id: token.__clientId,
				...(token.__clientSecret ? { client_secret: token.__clientSecret } : {}),
				refresh_token: token.refresh_token,
			});
		} else {
			response = await requestBrokerRefresh(token.refresh_token);
		}
	} catch (error) {
		throw new Error(`${errorMessage(error)}; if this persists, ${signInAgain}`);
	}

	const refreshed: TokenPayload = {
		...token,
		access_token: response.access_token,
		refresh_token: response.refresh_token || token.refresh_token,
		expiry_date: expiryFromResponse(response),
		scope: response.scope || token.scope,
		token_type: response.token_type || token.token_type,
	};
	writeToken(refreshed);
	return refreshed;
}

async function requestGoogleToken(
	params: Record<string, string>,
	signal?: AbortSignal,
): Promise<TokenEndpointResponse & { access_token: string }> {
	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(params).toString(),
		signal: withTimeout(signal, TOKEN_REQUEST_TIMEOUT_MS),
	});
	return parseTokenResponse(response, "Google token endpoint");
}

async function requestBrokerRefresh(refreshToken: string): Promise<TokenEndpointResponse & { access_token: string }> {
	const response = await fetch(`${BROKER_BASE_URL}/refresh`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refresh_token: refreshToken }),
		signal: withTimeout(undefined, TOKEN_REQUEST_TIMEOUT_MS),
	});
	return parseTokenResponse(response, "Radius broker");
}

async function parseTokenResponse(
	response: Response,
	source: string,
): Promise<TokenEndpointResponse & { access_token: string }> {
	let payload: TokenEndpointResponse;
	try {
		payload = (await response.json()) as TokenEndpointResponse;
	} catch {
		throw new Error(`${source} returned HTTP ${response.status}`);
	}

	if (!response.ok || payload.error || !payload.access_token) {
		const error = typeof payload.error === "object" ? payload.error?.message : payload.error;
		const description = payload.error_description ? `: ${payload.error_description}` : "";
		throw new Error(
			`${source} refused the token request (HTTP ${response.status}) ${error || ""}${description}`.trim(),
		);
	}

	return payload as TokenEndpointResponse & { access_token: string };
}

function expiryFromResponse(response: TokenEndpointResponse): number {
	if (typeof response.expiry_date === "number" && response.expiry_date > Date.now()) {
		return response.expiry_date;
	}
	const expiresIn = Number(response.expires_in);
	return Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000;
}

// ---------------------------------------------------------------------------
// Config and token storage

// Never throws, so a broken config cannot break status or autocompletion.
// Callers that need the config report `error` themselves.
function loadConfig(): LoadedConfig {
	let raw: string;
	try {
		raw = fs.readFileSync(CONFIG_PATH, "utf8");
	} catch {
		return { accounts: [] };
	}
	if (!raw.trim()) {
		return { accounts: [] };
	}

	try {
		const parsed = JSON.parse(raw) as { accounts?: unknown };
		if (!Array.isArray(parsed.accounts)) {
			return {
				accounts: [],
				error: `"accounts" in ${CONFIG_PATH} must be an array of {email, client_id, client_secret}`,
			};
		}
		const accounts = (parsed.accounts as Array<AccountConfig | null>)
			.filter((entry): entry is AccountConfig => typeof entry?.email === "string")
			.map((entry) => ({ ...entry, email: normalizeEmail(entry.email) }));
		return { accounts };
	} catch (error) {
		return { accounts: [], error: `Invalid ${CONFIG_PATH}: ${errorMessage(error)}` };
	}
}

function listConnections(): Connection[] {
	let filenames: string[];
	try {
		filenames = fs.readdirSync(TOKENS_DIR);
	} catch {
		return [];
	}

	const connections: Connection[] = [];
	for (const filename of filenames) {
		if (!filename.endsWith(".json")) continue;
		const tokenPath = path.join(TOKENS_DIR, filename);
		const token = readToken(tokenPath);
		if (token && typeof token.access_token === "string" && EMAIL_PATTERN.test(token.__email)) {
			connections.push({ email: token.__email, tokenPath, token });
		}
	}
	return connections.sort((a, b) => a.email.localeCompare(b.email));
}

function readToken(tokenPath: string): TokenPayload | undefined {
	try {
		const token = JSON.parse(fs.readFileSync(tokenPath, "utf8")) as TokenPayload;
		// Tokens written by @earendil-works/pi-radius-work are broker tokens.
		return { ...token, __authMode: token.__authMode === "pkce" ? "pkce" : "broker" };
	} catch {
		return undefined;
	}
}

function writeToken(token: TokenPayload): string {
	fs.mkdirSync(TOKENS_DIR, { recursive: true, mode: 0o700 });
	const tokenPath = tokenPathForEmail(token.__email);
	const tempPath = `${tokenPath}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
	try {
		fs.writeFileSync(tempPath, JSON.stringify(token, null, 2), { mode: 0o600 });
		fs.renameSync(tempPath, tokenPath);
	} finally {
		// No-op after a successful rename; removes the leftover if the write or rename failed.
		fs.rmSync(tempPath, { force: true });
	}
	try {
		fs.chmodSync(tokenPath, 0o600);
	} catch {
		// Ignore chmod failures on non-POSIX filesystems.
	}
	return tokenPath;
}

// Same filename scheme as @earendil-works/pi-radius-work, so existing tokens keep working.
function tokenPathForEmail(email: string): string {
	return path.join(TOKENS_DIR, `${encodeURIComponent(normalizeEmail(email))}.json`);
}

function normalizeEmail(email: string): string {
	const normalized = String(email || "")
		.trim()
		.toLowerCase();
	if (!normalized) {
		throw new Error("Google account email is missing.");
	}
	if (!EMAIL_PATTERN.test(normalized)) {
		throw new Error(`Invalid email address: ${email}`);
	}
	return normalized;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
	return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
	const timeout = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
