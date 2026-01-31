import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function notify(title: string, body: string): void {
	process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
}

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		notify("Pi", "Ready for your next shitty prompt.");
	});
}
