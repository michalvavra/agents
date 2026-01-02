import puppeteer from "puppeteer";

export async function launchBrowser(profileDir, headless) {
	return puppeteer.launch({
		headless,
		userDataDir: profileDir,
		args: ["--no-first-run", "--no-default-browser-check"],
	});
}

export async function setupConsoleCaptureOnNewDocument(page) {
	await page.evaluateOnNewDocument(() => {
		window.__consoleMessages = [];
		["log", "warn", "error", "info", "debug"].forEach((method) => {
			const original = console[method];
			console[method] = function (...args) {
				const message = args
					.map((arg) => {
						if (typeof arg === "object") {
							try {
								return JSON.stringify(arg);
							} catch {
								return String(arg);
							}
						}
						return String(arg);
					})
					.join(" ");
				window.__consoleMessages.push({ level: method.toUpperCase(), message });
				original.apply(console, args);
			};
		});
	});
}

export async function getConsoleMessages(page) {
	try {
		return await page.evaluate(() => window.__consoleMessages || []);
	} catch {
		return [];
	}
}

export async function getPageContent(page) {
	const client = await page.createCDPSession();
	const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
	const { outerHTML } = await client.send("DOM.getOuterHTML", { nodeId: root.nodeId });
	await client.detach();
	return outerHTML;
}
