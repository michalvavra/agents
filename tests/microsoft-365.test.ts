import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import {
	discoverAndLoadExtensions,
	ExtensionRunner,
	ModelRegistry,
	ModelRuntime,
	SessionManager,
} from "@earendil-works/pi-coding-agent";

const extensionPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"agents",
	"pi",
	"extensions",
	"microsoft-365.ts",
);

type Notification = { message: string; type?: "info" | "warning" | "error" };

// The extension reads its directories once at load, so each test loads a fresh copy.
async function createHarness(pastes: Array<(authorizeUrl: URL) => string | undefined>) {
	const dir = await mkdtemp(join(tmpdir(), "pi-microsoft-365-"));
	const configPath = join(dir, "config.json");
	await writeFile(
		configPath,
		JSON.stringify({
			accounts: [
				{
					email: "me@example.com",
					client_id: "test-client",
					tenant: "test-tenant",
					// Not the default port, so the test never collides with a real sign-in.
					redirect_uri: "http://localhost:53999/callback",
				},
			],
		}),
	);
	process.env.MICROSOFT_365_TOKENS_DIR = join(dir, "tokens");
	process.env.MICROSOFT_365_CONFIG = configPath;

	const loaded = await discoverAndLoadExtensions([extensionPath], dir, join(dir, ".agent"));
	assert.deepEqual(loaded.errors, []);
	const modelRuntime = await ModelRuntime.create({
		credentials: new InMemoryCredentialStore(),
		modelsPath: null,
		allowModelNetwork: false,
	});
	const runner = new ExtensionRunner(
		loaded.extensions,
		loaded.runtime,
		dir,
		SessionManager.inMemory(dir),
		new ModelRegistry(modelRuntime),
	);

	const notifications: Notification[] = [];
	let authorizeUrl: URL | undefined;
	runner.setUIContext({
		...runner.getUIContext(),
		notify: (message, type) => {
			notifications.push({ message, type });
			authorizeUrl ??= new URL(message.match(/https:\/\/login\.microsoftonline\.com\/\S+/)?.[0] ?? "invalid:");
		},
		input: async () => {
			assert.ok(authorizeUrl, "the sign-in URL should be shown before the paste prompt");
			return pastes.shift()?.(authorizeUrl);
		},
	});

	const runLogin = async () => {
		const command = runner.getCommand("microsoft-365");
		assert.ok(command, "/microsoft-365 should be registered");
		// Keep the test from opening a real browser: with no PATH the open command is missing.
		const path = process.env.PATH;
		process.env.PATH = "";
		try {
			await command.handler("", runner.createCommandContext());
		} finally {
			process.env.PATH = path;
		}
	};

	return { dir, notifications, runLogin };
}

test("Microsoft sign-in URL is shown with the configured redirect, ready to open on another device", async () => {
	let shownUrl: URL | undefined;
	const { dir, runLogin } = await createHarness([
		(authorizeUrl) => {
			shownUrl = authorizeUrl;
			return undefined;
		},
	]);

	try {
		await runLogin();

		assert.ok(shownUrl);
		assert.equal(shownUrl.pathname, "/test-tenant/oauth2/v2.0/authorize");
		assert.equal(shownUrl.searchParams.get("redirect_uri"), "http://localhost:53999/callback");
		assert.equal(shownUrl.searchParams.get("login_hint"), "me@example.com");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("a pasted redirect URL with the wrong state is rejected", async () => {
	const { dir, notifications, runLogin } = await createHarness([
		() => "http://localhost:53999/callback?code=stolen-code&state=not-the-one-we-sent",
	]);

	try {
		await runLogin();

		assert.deepEqual(notifications.at(-1), {
			message: "Microsoft 365 login failed: Authentication failed: OAuth state mismatch.",
			type: "error",
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("user is asked again after pasting something that is not a redirect URL, and can cancel", async () => {
	const { dir, notifications, runLogin } = await createHarness([() => "hello", () => undefined]);

	try {
		await runLogin();

		assert.ok(notifications.some((n) => n.type === "warning" && /not a sign-in redirect URL/.test(n.message)));
		assert.deepEqual(notifications.at(-1), { message: "Microsoft 365 sign-in cancelled", type: "info" });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("a pasted OAuth error fails Microsoft sign-in with the error", async () => {
	const { dir, notifications, runLogin } = await createHarness([
		(authorizeUrl) =>
			`http://localhost:53999/callback?error=access_denied&error_description=Declined&state=${authorizeUrl.searchParams.get("state")}`,
	]);

	try {
		await runLogin();

		assert.deepEqual(notifications.at(-1), {
			message: "Microsoft 365 login failed: Microsoft OAuth error: access_denied. Declined",
			type: "error",
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
