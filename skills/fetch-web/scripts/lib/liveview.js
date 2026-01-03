export async function detectLiveView(page) {
	try {
		return await page.evaluate(() => document.querySelector("[data-phx-session]") !== null);
	} catch {
		return false;
	}
}

export async function waitForLiveViewConnection(page, timeout = 10000) {
	try {
		await page.waitForSelector(".phx-connected", { timeout });
		return true;
	} catch {
		return false;
	}
}

export async function waitForLiveViewNavigation(page, timeout = 5000) {
	try {
		await page.waitForFunction(
			() => {
				const state = window.__phxNavigationState;
				return !state || !state.loading;
			},
			{ timeout }
		);
		// Additional wait for DOM to settle
		await new Promise((r) => setTimeout(r, 100));
		return true;
	} catch {
		return false;
	}
}

export async function injectLiveViewNavigationTracking(page) {
	await page.evaluate(() => {
		if (!window.__phxNavigationState) {
			window.__phxNavigationState = { loading: false, navigated: false };
			document.addEventListener("phx:page-loading-start", () => {
				window.__phxNavigationState.loading = true;
				window.__phxNavigationState.navigated = true;
			});
			document.addEventListener("phx:page-loading-stop", () => {
				window.__phxNavigationState.loading = false;
			});
		}
	});
}

export async function checkLiveViewNavigation(page) {
	return await page.evaluate(() => window.__phxNavigationState?.navigated || false);
}
