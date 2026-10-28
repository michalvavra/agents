import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
	"google-workspace.ts",
);

type Notification = { message: string; type?: "info" | "warning" | "error" };

// The extension reads its directories once at load, so each test loads a fresh copy.
async function createHarness(pastes: Array<string | undefined>) {
	const dir = await mkdtemp(join(tmpdir(), "pi-google-workspace-"));
	process.env.GOOGLE_WORKSPACE_TOKENS_DIR = join(dir, "tokens");
	// No config file: sign-in goes through the broker.
	process.env.GOOGLE_WORKSPACE_CONFIG = join(dir, "config.json");

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
	const prompts: string[] = [];
	runner.setUIContext({
		...runner.getUIContext(),
		notify: (message, type) => notifications.push({ message, type }),
		input: async (title) => {
			prompts.push(title);
			return pastes.shift();
		},
	});

	const runLogin = async () => {
		const command = runner.getCommand("google-workspace");
		assert.ok(command, "/google-workspace should be registered");
		// Keep the test from opening a real browser: with no PATH the open command is missing.
		const path = process.env.PATH;
		process.env.PATH = "";
		try {
			await command.handler("", runner.createCommandContext());
		} finally {
			process.env.PATH = path;
		}
	};

	return { dir, notifications, prompts, runLogin };
}

function brokerRedirectUrl(): string {
	const url = new URL("http://localhost:41234/oauth2callback");
	url.searchParams.set("email", "Me@Example.com");
	url.searchParams.set("access_token", "access-from-other-device");
	url.searchParams.set("refresh_token", "refresh-from-other-device");
	url.searchParams.set("expiry_date", String(Date.now() + 3_600_000));
	return url.toString();
}

test("user can finish Google sign-in on another device by pasting the redirect URL", async () => {
	const { dir, notifications, prompts, runLogin } = await createHarness([brokerRedirectUrl()]);

	try {
		await runLogin();

		assert.equal(prompts.length, 1);
		assert.match(notifications[0].message, /https:\/\/radius\.pi\.dev\/.*\/start\?return_to=/);
		const connected = notifications.at(-1)?.message ?? "";
		assert.match(connected, /^Connected Google Workspace account: me@example\.com\nToken: /);

		const tokenPath = connected.split("\nToken: ")[1];
		assert.ok(tokenPath.startsWith(join(dir, "tokens")));
		const token = JSON.parse(await readFile(tokenPath, "utf8"));
		assert.equal(token.access_token, "access-from-other-device");
		assert.equal(token.refresh_token, "refresh-from-other-device");
		assert.equal(token.__authMode, "broker");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("user is asked again after pasting something that is not a redirect URL", async () => {
	const { dir, notifications, prompts, runLogin } = await createHarness([
		"https://example.com/some-other-page",
		brokerRedirectUrl(),
	]);

	try {
		await runLogin();

		assert.equal(prompts.length, 2);
		assert.ok(notifications.some((n) => n.type === "warning" && /not a sign-in redirect URL/.test(n.message)));
		assert.match(notifications.at(-1)?.message ?? "", /^Connected Google Workspace account/);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("dismissing the paste prompt cancels Google sign-in", async () => {
	const { dir, notifications, runLogin } = await createHarness([undefined]);

	try {
		await runLogin();

		assert.deepEqual(notifications.at(-1), { message: "Google Workspace sign-in cancelled", type: "info" });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("a pasted OAuth error fails Google sign-in with the error", async () => {
	const { dir, notifications, runLogin } = await createHarness([
		"http://localhost:41234/oauth2callback?error=access_denied&error_description=User+declined",
	]);

	try {
		await runLogin();

		assert.deepEqual(notifications.at(-1), {
			message: "Google Workspace login failed: Google OAuth error: access_denied. User declined",
			type: "error",
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
