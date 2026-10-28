/*
 * Microsoft 365 for pi. /microsoft-365 signs in to the accounts configured in
 * ~/.pi/microsoft-365/config.json (OAuth 2.0 authorization code + PKCE), and the
 * microsoft_graph tool calls Microsoft Graph as a connected account.
 * See README.md for the config format.
 *
 * Sign-in also works from another device: open the printed URL anywhere, then paste the
 * localhost URL the browser ends on (it does not load there) back into pi.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
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

const STATUS_KEY = "microsoft-365";

const BASE_DIR = path.join(os.homedir(), ".pi", "microsoft-365");
const TOKENS_DIR = process.env.MICROSOFT_365_TOKENS_DIR || path.join(BASE_DIR, "tokens");
const CONFIG_PATH = process.env.MICROSOFT_365_CONFIG || path.join(BASE_DIR, "config.json");

const DEFAULT_TENANT = "common";
const DEFAULT_REDIRECT_URI = "http://localhost:53134/callback";
const DEFAULT_SCOPES = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite"];

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const GRAPH_DEFAULT_VERSION = "v1.0";

// Long enough to finish sign-in on another device and paste the redirect URL back.
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;
const TOKEN_REQUEST_TIMEOUT_MS = 15 * 1000;
const GRAPH_REQUEST_TIMEOUT_MS = 60 * 1000;
// Refresh the access token before a Graph call when it expires within this window.
const REFRESH_BEFORE_CALL_MS = 2 * 60 * 1000;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+$/;

type TokenPayload = {
	access_token: string;
	refresh_token?: string | null;
	expiry_date: number;
	scope?: string;
	token_type?: string;
	__authMode: "pkce";
	__email: string;
	__clientId: string;
	__tenant: string;
	__scopes: string[];
};

type Connection = { email: string; tokenPath: string; token: TokenPayload };

type AccountConfig = {
	email: string;
	client_id?: string;
	tenant?: string;
	redirect_uri?: string;
	scopes?: string[];
};

type LoadedConfig = { accounts: AccountConfig[]; error?: string };

type ResolvedOAuthConfig = {
	clientId: string;
	tenant: string;
	redirectUri: string;
	scopes: string[];
};

type TokenEndpointResponse = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number | string;
	scope?: string;
	token_type?: string;
	error?: string;
	error_description?: string;
};

type LoginResult = { email: string; tokenPath: string };

/** Asks for the pasted redirect URL; resolves undefined when the user dismissed the prompt. */
type PromptForRedirectUrl = (signal: AbortSignal, previousInputInvalid: boolean) => Promise<string | undefined>;

class SignInCancelledError extends Error {
	constructor() {
		super("Microsoft 365 authentication cancelled.");
	}
}

type ExtensionState = { loginController?: AbortController; shuttingDown: boolean };

const GRAPH_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

const MicrosoftGraphParams = Type.Object({
	path: Type.String({
		description:
			'Graph path relative to https://graph.microsoft.com/v1.0, e.g. "/me/messages". Prefix "/beta/" for the beta API. An @odata.nextLink URL is accepted as-is.',
	}),
	method: Type.Optional(StringEnum(GRAPH_METHODS, { description: "HTTP method (default GET)" })),
	account: Type.Optional(
		Type.String({ description: "Connected account email. Required when more than one account is connected." }),
	),
	query: Type.Optional(
		Type.Record(Type.String(), Type.String(), {
			description: 'Query parameters, e.g. {"$top": "10", "$select": "subject,from"}',
		}),
	),
	body: Type.Optional(Type.Any({ description: "Request body. Objects are sent as JSON." })),
	headers: Type.Optional(
		Type.Record(Type.String(), Type.String(), {
			description:
				'Extra request headers, e.g. {"ConsistencyLevel": "eventual"}. Authorization is set automatically.',
		}),
	),
});

type MicrosoftGraphInput = Static<typeof MicrosoftGraphParams>;

const MicrosoftGraphOutput = Type.Object({
	account: Type.String(),
	status: Type.Number(),
	headers: Type.Record(Type.String(), Type.String()),
	bodyEncoding: StringEnum(["json", "text", "base64", "empty"] as const),
	body: Type.Any(),
});

type GraphResult = Static<typeof MicrosoftGraphOutput>;

// One in-flight refresh per account, so parallel Graph calls share it. This is per process:
// two pi sessions refreshing the same account both call the token endpoint and the last
// write wins. That works because Microsoft keeps the previous refresh token valid.
const refreshesInFlight = new Map<string, Promise<TokenPayload>>();

export default function microsoft365Extension(pi: ExtensionAPI) {
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
					"\n\nMicrosoft 365: no locally connected accounts were found. If the user asks for Outlook mail, Calendar, Teams chat, OneDrive, SharePoint, or other Microsoft Graph access, ask them to run /microsoft-365 first.",
			};
		}

		const lines = connections.map((connection) => `- ${connection.email}`);
		return {
			systemPrompt:
				event.systemPrompt +
				"\n\nMicrosoft 365 local connections:\n" +
				`${lines.join("\n")}\n` +
				"When the user asks for Microsoft 365 data (Outlook mail, Calendar, Teams chat, OneDrive, SharePoint) for a specific email account, use the matching connected account above with the microsoft_graph tool. " +
				"The tool handles credentials; do not read token files or expose token values. If they do not specify an account and exactly one account is connected, use it by default; otherwise ask which account.",
		};
	});

	pi.registerTool({
		name: "microsoft_graph",
		label: "Microsoft Graph",
		description:
			"Call Microsoft Graph (https://graph.microsoft.com) as a connected Microsoft 365 account. " +
			"Authentication and token refresh are handled automatically. " +
			"Returns { account, status, headers, bodyEncoding, body }; JSON responses are parsed into body. " +
			`The text shown to the model is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; the full body is then saved to a temp file. ` +
			"Follow paging by passing body['@odata.nextLink'] as path.",
		promptSnippet: "Call Microsoft Graph (Outlook mail, Calendar, Teams chat, OneDrive) as a connected account",
		promptGuidelines: [
			"Use $select and $top to keep microsoft_graph responses small.",
			"In codemode, batch independent microsoft_graph calls with Promise.all and filter results in the script.",
			"Ask before sending mail or chat messages, or creating, changing or deleting data, unless the user asked for it explicitly.",
		],
		parameters: MicrosoftGraphParams,
		outputSchema: MicrosoftGraphOutput,
		executionMode: "parallel",

		async execute(_toolCallId, params, signal) {
			const result = await callMicrosoftGraph(params, signal);
			const { text, fullOutputPath } = await formatGraphResultForModel(result, params);
			return {
				content: [{ type: "text", text }],
				details: { account: result.account, status: result.status, fullOutputPath },
				structuredContent: result,
				isError: result.status < 200 || result.status >= 300,
			};
		},
	});

	pi.registerCommand("microsoft-365", {
		description:
			"Connect a Microsoft 365 account (/microsoft-365 [email]), or run /microsoft-365 status|logout|refresh",
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
					ctx.ui.notify("Microsoft 365 status loaded", "info");
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

async function callMicrosoftGraph(params: MicrosoftGraphInput, signal: AbortSignal | undefined): Promise<GraphResult> {
	const email = resolveToolAccount(params.account, listConnections());
	const url = buildGraphUrl(params.path, params.query);
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
			signal: withTimeout(signal, GRAPH_REQUEST_TIMEOUT_MS),
		});

	let response = await send(await getValidToken(email));
	if (response.status === 401) {
		// Access token revoked or expired early; refresh once and retry.
		await response.body?.cancel();
		response = await send(await forceRefreshToken(email));
	}

	return readGraphResponse(email, response);
}

function resolveToolAccount(requested: string | undefined, connections: Connection[]): string {
	if (connections.length === 0) {
		throw new Error("no Microsoft 365 accounts connected; ask the user to run /microsoft-365");
	}
	const available = connections.map((connection) => connection.email).join(", ");

	if (requested) {
		const email = normalizeEmail(requested);
		if (!connections.some((connection) => connection.email === email)) {
			throw new Error(
				`${email} is not connected (connected: ${available}); ask the user to run /microsoft-365 ${email}`,
			);
		}
		return email;
	}

	if (connections.length === 1) return connections[0].email;
	throw new Error(`several accounts are connected; pass account (one of: ${available})`);
}

function buildGraphUrl(rawPath: string, query: Record<string, string> | undefined): URL {
	const trimmed = String(rawPath || "").trim();
	if (!trimmed) throw new Error("path is required");

	let url: URL;
	if (/^https?:\/\//i.test(trimmed)) {
		url = new URL(trimmed);
		// Only Graph URLs are accepted. Graph may redirect downloads (e.g. /content) to
		// pre-authenticated storage URLs; fetch follows them and drops the Authorization
		// header on cross-origin redirects, so the token is only ever sent to Graph.
		if (url.origin !== GRAPH_ORIGIN) {
			throw new Error(`only ${GRAPH_ORIGIN} URLs are allowed (got ${url.origin})`);
		}
	} else {
		const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
		const versioned = /^\/(v1\.0|beta)(\/|$|\?)/.test(relative) ? relative : `/${GRAPH_DEFAULT_VERSION}${relative}`;
		url = new URL(`${GRAPH_ORIGIN}${versioned}`);
	}

	for (const [key, value] of Object.entries(query || {})) {
		url.searchParams.set(key, value);
	}
	// Keep OData system query options readable ($top, not %24top).
	url.search = url.search.replace(/%24/g, "$");
	return url;
}

async function readGraphResponse(account: string, response: Response): Promise<GraphResult> {
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
	if (contentType.startsWith("text/") || contentType.includes("xml")) {
		return { ...base, bodyEncoding: "text", body: buffer.toString("utf8") };
	}
	return { ...base, bodyEncoding: "base64", body: buffer.toString("base64") };
}

async function formatGraphResultForModel(
	result: GraphResult,
	params: MicrosoftGraphInput,
): Promise<{ text: string; fullOutputPath?: string }> {
	const header = `${params.method || "GET"} ${params.path} -> HTTP ${result.status} (${result.account})`;
	const body = formatGraphBody(result);
	const truncation = truncateHead(body, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
	if (!truncation.truncated) {
		return { text: `${header}\n${body}` };
	}

	const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-microsoft-graph-"));
	const fullOutputPath = path.join(tempDir, "body.txt");
	await fs.promises.writeFile(fullOutputPath, body, { encoding: "utf8", mode: 0o600 });

	const notice =
		`[Body truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines ` +
		`(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
		`Full body saved to ${fullOutputPath}. Use $select/$top to request less.]`;
	return { text: `${header}\n${truncation.content}\n\n${notice}`, fullOutputPath };
}

function formatGraphBody(result: GraphResult): string {
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

function listCommandCompletions(prefix: string) {
	const options = [
		{ value: "status", label: "status", description: "List connected accounts" },
		{ value: "refresh", label: "refresh", description: "Refresh access tokens now" },
		...loadConfig().accounts.map((account) => ({
			value: account.email,
			label: account.email,
			description: "Sign in",
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
			? "Microsoft 365: not connected"
			: `Microsoft 365: connected (${connections.length} account${connections.length === 1 ? "" : "s"})`;

	return [
		summary,
		`Tokens directory: ${TOKENS_DIR}`,
		`Config: ${CONFIG_PATH}`,
		...(config.error ? [`Config error: ${config.error}`] : []),
		...connections.map(
			(connection) => `- ${connection.email}: ${connection.tokenPath} (${formatExpiry(connection.token)})`,
		),
		...(notSignedIn.length > 0 ? [`Configured, not signed in: ${notSignedIn.join(", ")}`] : []),
		...(connections.length === 0 ? ["Run /microsoft-365 [email] to connect an account."] : []),
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
		ui.setStatus(STATUS_KEY, "Microsoft 365: not connected");
		return;
	}

	if (connections.length === 1) {
		ui.setStatus(STATUS_KEY, `Microsoft 365: ${connections[0].email}`);
		return;
	}

	ui.setStatus(STATUS_KEY, `Microsoft 365: ${connections.length} accounts connected`);
}

async function runLogoutCommand(emailArg: string | undefined, ctx: ExtensionCommandContext): Promise<void> {
	const connections = listConnections();
	if (connections.length === 0) {
		ctx.ui.notify("Microsoft 365: no connected accounts", "info");
		return;
	}

	let email = emailArg ? normalizeEmail(emailArg) : undefined;
	if (!email && connections.length === 1) {
		email = connections[0].email;
	} else if (!email && ctx.hasUI) {
		email = await ctx.ui.select(
			"Log out of which Microsoft 365 account?",
			connections.map((connection) => connection.email),
		);
	}
	if (!email) {
		ctx.ui.notify("Usage: /microsoft-365 logout you@company.com", "warning");
		return;
	}

	const connection = connections.find((entry) => entry.email === email);
	if (!connection) {
		ctx.ui.notify(`Microsoft 365: ${email} is not connected`, "warning");
		return;
	}

	fs.rmSync(connection.tokenPath, { force: true });
	ctx.ui.notify(`Removed Microsoft 365 account: ${email}`, "info");
}

async function runRefreshCommand(ctx: ExtensionCommandContext): Promise<void> {
	const connections = listConnections();
	if (connections.length === 0) {
		ctx.ui.notify("Microsoft 365: no connected accounts", "info");
		return;
	}

	const results = await Promise.allSettled(connections.map((connection) => forceRefreshToken(connection.email)));
	const errors = results.flatMap((result, index) =>
		result.status === "rejected" ? [`- ${connections[index].email}: ${errorMessage(result.reason)}`] : [],
	);

	if (errors.length > 0) {
		ctx.ui.notify(`Microsoft 365 refresh failed:\n${errors.join("\n")}`, "error");
	} else {
		ctx.ui.notify("Microsoft 365 tokens refreshed", "info");
	}
}

async function runLoginCommand(emailArg: string, ctx: ExtensionCommandContext, state: ExtensionState): Promise<void> {
	if (state.loginController) {
		ctx.ui.notify("Microsoft 365 sign-in is already in progress", "warning");
		return;
	}

	const controller = new AbortController();
	state.loginController = controller;

	try {
		const email = await resolveLoginEmail(emailArg, ctx);
		if (!email) {
			ctx.ui.notify("Usage: /microsoft-365 you@company.com", "warning");
			return;
		}

		ctx.ui.setStatus(STATUS_KEY, `Waiting for Microsoft 365 sign-in (${email})...`);
		const promptForRedirectUrl = ctx.hasUI ? createRedirectUrlPrompt(ctx.ui, email, ctx.mode === "tui") : undefined;
		const result = await loginMicrosoft365Account(email, controller.signal, promptForRedirectUrl);

		if (state.shuttingDown) {
			return;
		}

		ctx.ui.notify(`Connected Microsoft 365 account: ${result.email}\nToken: ${result.tokenPath}`, "info");
	} catch (error) {
		if (state.shuttingDown) {
			return;
		}
		if (error instanceof SignInCancelledError) {
			ctx.ui.notify("Microsoft 365 sign-in cancelled", "info");
		} else {
			ctx.ui.notify(`Microsoft 365 login failed: ${errorMessage(error)}`, "error");
		}
	} finally {
		if (state.loginController === controller) {
			state.loginController = undefined;
		}
	}
}

async function resolveLoginEmail(arg: string, ctx: ExtensionCommandContext): Promise<string | undefined> {
	if (arg) {
		return normalizeEmail(arg);
	}

	const config = loadConfig();
	if (config.error) {
		throw new Error(config.error);
	}
	const configured = config.accounts.map((account) => account.email);
	if (configured.length === 0) {
		throw new Error(
			`No accounts configured. Add {"email": "…", "client_id": "…", "tenant": "…"} to "accounts" in ${CONFIG_PATH}`,
		);
	}
	if (configured.length === 1) {
		return configured[0];
	}
	if (!ctx.hasUI) {
		return undefined;
	}

	const connected = new Set(listConnections().map((connection) => connection.email));
	const labels = configured.map((email) => (connected.has(email) ? `${email} (connected)` : email));
	const choice = await ctx.ui.select("Sign in to which Microsoft 365 account?", labels);
	return choice ? configured[labels.indexOf(choice)] : undefined;
}

/**
 * Prints the sign-in URL and waits for a pasted redirect URL, so sign-in works from another
 * device: the browser there ends on a localhost page that cannot reach this machine.
 */
function createRedirectUrlPrompt(
	ui: ExtensionUIContext,
	email: string,
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
				`Microsoft 365 sign-in (${email})${copied ? ", URL copied to clipboard" : ""}:\n${startUrl}\n\n` +
					"Signing in on another device? The browser ends on a localhost page that does not load. " +
					"Copy that page's URL from the address bar and paste it here.",
				"info",
			);
		}
		return ui.input(
			"Waiting for Microsoft sign-in. Paste the redirect URL from another device:",
			"http://localhost:…",
			{
				signal,
			},
		);
	};
}

async function loginMicrosoft365Account(
	email: string,
	signal: AbortSignal,
	promptForRedirectUrl?: (startUrl: string) => PromptForRedirectUrl,
): Promise<LoginResult> {
	const oauth = resolveOAuthConfig(email);
	const redirect = new URL(oauth.redirectUri);
	if (redirect.protocol !== "http:" || !redirect.port) {
		throw new Error(`redirect_uri must be http://localhost:<port>/<path> (got ${oauth.redirectUri})`);
	}

	const codeVerifier = crypto.randomBytes(32).toString("base64url");
	const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
	const state = crypto.randomBytes(16).toString("base64url");

	const authorizeUrl = new URL(`https://login.microsoftonline.com/${oauth.tenant}/oauth2/v2.0/authorize`);
	authorizeUrl.searchParams.set("client_id", oauth.clientId);
	authorizeUrl.searchParams.set("response_type", "code");
	authorizeUrl.searchParams.set("redirect_uri", oauth.redirectUri);
	authorizeUrl.searchParams.set("response_mode", "query");
	authorizeUrl.searchParams.set("scope", oauth.scopes.join(" "));
	authorizeUrl.searchParams.set("state", state);
	authorizeUrl.searchParams.set("code_challenge", codeChallenge);
	authorizeUrl.searchParams.set("code_challenge_method", "S256");
	authorizeUrl.searchParams.set("login_hint", email);

	const code = await waitForOAuthRedirect({
		redirect,
		startUrl: authorizeUrl.toString(),
		state,
		signal,
		promptForRedirectUrl: promptForRedirectUrl?.(authorizeUrl.toString()),
	});

	const response = await requestToken(
		oauth.tenant,
		{
			grant_type: "authorization_code",
			client_id: oauth.clientId,
			code,
			redirect_uri: oauth.redirectUri,
			code_verifier: codeVerifier,
			scope: oauth.scopes.join(" "),
		},
		signal,
	);

	// Store under the configured email so config and token always match.
	const token: TokenPayload = {
		access_token: response.access_token,
		refresh_token: response.refresh_token || null,
		expiry_date: expiryFromResponse(response),
		scope: response.scope || undefined,
		token_type: response.token_type || undefined,
		__authMode: "pkce",
		__email: normalizeEmail(email),
		__clientId: oauth.clientId,
		__tenant: oauth.tenant,
		__scopes: oauth.scopes,
	};

	const tokenPath = writeToken(token);
	return { email: token.__email, tokenPath };
}

/**
 * Resolves with the authorization code, from whichever arrives first: the browser hitting
 * the local callback server, or the redirect URL pasted into promptForRedirectUrl (sign-in
 * on another device).
 */
async function waitForOAuthRedirect(input: {
	redirect: URL;
	startUrl: string;
	state: string;
	signal: AbortSignal;
	promptForRedirectUrl?: PromptForRedirectUrl;
}): Promise<string> {
	const { redirect, startUrl, state, signal, promptForRedirectUrl } = input;
	if (signal.aborted) {
		throw new SignInCancelledError();
	}

	const host = redirect.hostname;
	const port = Number.parseInt(redirect.port, 10);
	const callbackPath = redirect.pathname || "/";

	return new Promise<string>((resolve, reject) => {
		let settled = false;
		const promptController = new AbortController();
		const timer = setTimeout(
			() =>
				finish(new Error(`Authentication timed out after ${LOGIN_TIMEOUT_MS / 60_000} minutes. Please try again.`)),
			LOGIN_TIMEOUT_MS,
		);

		const finish = (error?: Error, code?: string) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			promptController.abort();
			if (server.listening) server.close();
			if (error) reject(error);
			else resolve(code as string);
		};

		const server = http.createServer((req, res) => {
			try {
				const parsed = new URL(req.url || "/", `http://${host}:${port}`);
				if (parsed.pathname !== callbackPath) {
					res.statusCode = 404;
					res.end("Not found");
					return;
				}

				const result = readRedirectCode(parsed.searchParams, state);
				if (result.error) {
					res.statusCode = 400;
					res.end("Authentication failed.");
					finish(result.error);
					return;
				}

				res.end("Authentication successful. You can close this tab.");
				finish(undefined, result.code);
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
				if (!params.has("code") && !params.has("error")) {
					previousInputInvalid = true;
					continue;
				}
				const result = readRedirectCode(params, state);
				finish(result.error, result.code);
			}
		};

		signal.addEventListener("abort", () => finish(new SignInCancelledError()), { once: true });

		server.on("error", (error: NodeJS.ErrnoException) => {
			const hint = error.code === "EADDRINUSE" ? ` Port ${port} is in use (another sign-in may be running).` : "";
			finish(new Error(`OAuth callback server error: ${error.message}.${hint}`));
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

/** Reads the authorization code from an OAuth redirect, or the error it reports. */
function readRedirectCode(params: URLSearchParams, state: string): { code?: string; error?: Error } {
	const errorCode = params.get("error");
	if (errorCode) {
		const description = params.get("error_description") || "No additional details";
		return { error: new Error(`Microsoft OAuth error: ${errorCode}. ${description}`) };
	}
	if (params.get("state") !== state) {
		return { error: new Error("Authentication failed: OAuth state mismatch.") };
	}
	const code = params.get("code");
	if (!code) {
		return { error: new Error("Authentication failed: callback did not include an authorization code.") };
	}
	return { code };
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
		throw new Error(`no token for ${email}; ask the user to run /microsoft-365 ${email}`);
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

class TokenEndpointError extends Error {
	code: string;

	constructor(code: string, description: string) {
		super(`${code}: ${description}`);
		this.code = code;
	}
}

async function refreshToken(token: TokenPayload): Promise<TokenPayload> {
	const signInAgain = `run /microsoft-365 ${token.__email} to sign in again`;
	if (!token.refresh_token) {
		throw new Error(`no refresh token stored; ${signInAgain}`);
	}

	let response: TokenEndpointResponse & { access_token: string };
	try {
		response = await requestToken(token.__tenant, {
			grant_type: "refresh_token",
			client_id: token.__clientId,
			refresh_token: token.refresh_token,
			scope: token.__scopes.join(" "),
		});
	} catch (error) {
		// invalid_grant: the refresh token expired or was revoked; only a new sign-in helps.
		if (error instanceof TokenEndpointError && error.code === "invalid_grant") {
			throw new Error(`${error.message}; ${signInAgain}`);
		}
		throw error;
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

async function requestToken(
	tenant: string,
	params: Record<string, string>,
	signal?: AbortSignal,
): Promise<TokenEndpointResponse & { access_token: string }> {
	const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(params).toString(),
		signal: withTimeout(signal, TOKEN_REQUEST_TIMEOUT_MS),
	});

	let payload: TokenEndpointResponse;
	try {
		payload = (await response.json()) as TokenEndpointResponse;
	} catch {
		throw new Error(`Token endpoint returned HTTP ${response.status}`);
	}

	if (!response.ok || payload.error || !payload.access_token) {
		const description = payload.error_description?.split("\r\n")[0] || `HTTP ${response.status}`;
		throw new TokenEndpointError(payload.error || "token_error", description);
	}

	return payload as TokenEndpointResponse & { access_token: string };
}

function expiryFromResponse(response: TokenEndpointResponse): number {
	const expiresIn = Number(response.expires_in);
	return Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000;
}

function resolveOAuthConfig(email: string): ResolvedOAuthConfig {
	const config = loadConfig();
	if (config.error) {
		throw new Error(config.error);
	}

	const normalized = normalizeEmail(email);
	const account = config.accounts.find((entry) => entry.email === normalized);
	if (!account?.client_id) {
		throw new Error(
			`No Microsoft 365 account configured for ${normalized}. Add {"email": "${normalized}", "client_id": "…", "tenant": "…"} to "accounts" in ${CONFIG_PATH}`,
		);
	}

	const scopes = account.scopes?.length ? [...account.scopes] : [...DEFAULT_SCOPES];
	if (!scopes.includes("offline_access")) scopes.unshift("offline_access");

	return {
		clientId: account.client_id,
		tenant: account.tenant || DEFAULT_TENANT,
		redirectUri: account.redirect_uri || DEFAULT_REDIRECT_URI,
		scopes,
	};
}

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
			return { accounts: [], error: `"accounts" in ${CONFIG_PATH} must be an array of {email, client_id, tenant}` };
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
		return JSON.parse(fs.readFileSync(tokenPath, "utf8")) as TokenPayload;
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

function tokenPathForEmail(email: string): string {
	return path.join(TOKENS_DIR, `${encodeURIComponent(normalizeEmail(email))}.json`);
}

function normalizeEmail(email: string): string {
	const normalized = String(email || "")
		.trim()
		.toLowerCase();
	if (!normalized) {
		throw new Error("Microsoft 365 account email is missing.");
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
