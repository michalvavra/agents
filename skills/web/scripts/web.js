#!/usr/bin/env node

import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

import { launchBrowser, setupConsoleCaptureOnNewDocument, getConsoleMessages, getPageContent } from "./lib/browser.js";
import { ensureProtocol, extractContent } from "./lib/content.js";
import { detectLiveView, waitForLiveViewConnection, waitForLiveViewNavigation, injectLiveViewNavigationTracking, checkLiveViewNavigation } from "./lib/liveview.js";
import { injectPicker, formatPickerOutput } from "./lib/picker.js";

const CACHE_DIR = join(homedir(), ".cache", "web");

function printHelp() {
	console.log(`web - Chrome-based web browsing for LLM agents

USAGE
    web <url> [OPTIONS]

OPTIONS
    --raw                Output raw HTML instead of markdown
    --screenshot <path>  Save screenshot to file
    --js <code>          Execute JavaScript on page
    --wait <selector>    Wait for CSS selector before extracting
    --wait-ms <ms>       Wait milliseconds after page load (default: 0)
    --timeout <ms>       Navigation timeout in ms (default: 30000)
    --profile <name>     Use named session profile (default: "default")
    --headless           Run in headless mode (default)
    --no-headless        Run with visible browser
    --pick <message>     Interactive element picker mode
    --cookies            Show cookies for the page
    --help               Show this help

EXAMPLES
    web https://example.com
    web https://example.com --screenshot page.png
    web https://example.com --js "document.title"
    web https://example.com --js "document.querySelector('a').click()" --wait-ms 1000
    web https://example.com --wait ".loaded" --profile mysite
    web https://example.com --pick "Click the submit button"
    web https://example.com --cookies
`);
}

function parseCliArgs() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			raw: { type: "boolean", default: false },
			screenshot: { type: "string" },
			js: { type: "string" },
			wait: { type: "string" },
			"wait-ms": { type: "string", default: "0" },
			timeout: { type: "string", default: "30000" },
			profile: { type: "string", default: "default" },
			headless: { type: "boolean", default: true },
			"no-headless": { type: "boolean", default: false },
			pick: { type: "string" },
			cookies: { type: "boolean", default: false },
			help: { type: "boolean", default: false },
		},
	});

	return {
		url: positionals[0],
		raw: values.raw,
		screenshot: values.screenshot,
		js: values.js,
		wait: values.wait,
		waitMs: parseInt(values["wait-ms"], 10),
		timeout: parseInt(values.timeout, 10),
		profile: values.profile,
		headless: values["no-headless"] ? false : values.headless,
		pick: values.pick,
		cookies: values.cookies,
		help: values.help,
	};
}

async function main() {
	const args = parseCliArgs();

	if (args.help || !args.url) {
		printHelp();
		process.exit(args.help ? 0 : 1);
	}

	const url = ensureProtocol(args.url);

	// Setup profile directory
	const profileDir = join(CACHE_DIR, "profiles", args.profile);
	if (!existsSync(profileDir)) {
		mkdirSync(profileDir, { recursive: true });
	}

	// Launch browser
	const browser = await launchBrowser(profileDir, args.pick ? false : args.headless);
	const page = await browser.newPage();

	// Setup timeout handler
	const timeoutId = setTimeout(async () => {
		console.error("Timeout: Operation took too long");
		await browser.close();
		process.exit(1);
	}, args.timeout + 10000);

	try {
		// Inject console capture before navigation
		await setupConsoleCaptureOnNewDocument(page);

		// Navigate to page
		await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: args.timeout,
		});

		// Check for LiveView and set up tracking
		let isLiveView = await detectLiveView(page);
		if (isLiveView) {
			console.error("Detected Phoenix LiveView page, waiting for connection...");
			const connected = await waitForLiveViewConnection(page);
			if (connected) {
				console.error("Phoenix LiveView connected");
				await injectLiveViewNavigationTracking(page);
			} else {
				console.error("Warning: LiveView connection timeout");
			}
		}

		// Wait for additional time if specified
		if (args.waitMs > 0) {
			await new Promise((r) => setTimeout(r, args.waitMs));
		}

		// Wait for selector if specified
		if (args.wait) {
			await page.waitForSelector(args.wait, { timeout: args.timeout });
		}

		// Handle cookies mode
		if (args.cookies) {
			const cookies = await page.cookies();
			for (const cookie of cookies) {
				console.log(`${cookie.name}: ${cookie.value}`);
				console.log(`  domain: ${cookie.domain}`);
				console.log(`  path: ${cookie.path}`);
				console.log(`  httpOnly: ${cookie.httpOnly}`);
				console.log(`  secure: ${cookie.secure}`);
				console.log("");
			}
			await closeBrowser(browser, args.headless, timeoutId);
			return;
		}

		// Handle pick mode
		if (args.pick) {
			await injectPicker(page);
			const result = await page.evaluate((msg) => window.pick(msg), args.pick);
			formatPickerOutput(result);
			await closeBrowser(browser, args.headless, timeoutId);
			return;
		}

		// Execute JavaScript if provided
		let jsResult = null;
		if (args.js) {
			const urlBeforeJs = page.url();

			// Execute JS - wrap in async function to support both expressions and statements
			jsResult = await page.evaluate((code) => {
				const AsyncFunction = (async () => {}).constructor;
				try {
					return new AsyncFunction(`return (${code})`)();
				} catch {
					return new AsyncFunction(code)();
				}
			}, args.js);

			// Check if navigation occurred
			const urlAfterJs = page.url();
			const urlChanged = urlBeforeJs !== urlAfterJs;

			if (isLiveView) {
				const navigated = await checkLiveViewNavigation(page);
				if (navigated || urlChanged) {
					console.error("Navigation detected, waiting for page to settle...");
					await waitForLiveViewNavigation(page);
					await waitForLiveViewConnection(page, 3000);
				}
			} else if (urlChanged) {
				console.error("Navigation detected, waiting for page to load...");
				try {
					await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 });
				} catch {
					// Navigation might have already completed
				}
			}

			// Apply post-JS wait time
			if (args.waitMs > 0) {
				await new Promise((r) => setTimeout(r, args.waitMs));
			}
		}

		// Take screenshot if requested
		if (args.screenshot) {
			await page.screenshot({ path: args.screenshot, fullPage: true });
			console.error(`Screenshot saved to ${args.screenshot}`);
		}

		// Get page content via CDP
		const outerHTML = await getPageContent(page);
		const finalUrl = page.url();

		// Get console messages
		const consoleMessages = await getConsoleMessages(page);

		// Output
		if (args.raw) {
			console.log(outerHTML);
		} else {
			const { title, content } = extractContent(outerHTML, finalUrl);

			console.log(`URL: ${finalUrl}`);
			if (title) console.log(`Title: ${title}`);
			console.log("");
			console.log(content);

			if (jsResult !== null && jsResult !== undefined) {
				console.log("");
				console.log("--- JavaScript Result ---");
				if (typeof jsResult === "object") {
					console.log(JSON.stringify(jsResult, null, 2));
				} else {
					console.log(jsResult);
				}
			}

			if (consoleMessages.length > 0) {
				console.log("");
				console.log("--- Console Output ---");
				for (const msg of consoleMessages) {
					console.log(`[${msg.level}] ${msg.message}`);
				}
			}
		}

		await closeBrowser(browser, args.headless, timeoutId);
	} catch (err) {
		clearTimeout(timeoutId);
		console.error(`Error: ${err.message}`);
		if (args.headless) {
			await browser.close();
		} else {
			browser.disconnect();
		}
		process.exit(1);
	}
}

async function closeBrowser(browser, headless, timeoutId) {
	if (headless) {
		await browser.close();
	} else {
		console.error("Browser left open (--no-headless mode)");
		browser.disconnect();
	}
	clearTimeout(timeoutId);
}

main();
