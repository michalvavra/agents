import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function escapeOsc(value: string): string {
  return value.replace(/[\x00-\x1f\x7f\x9b]/g, "");
}

function notify(title: string, body: string): void {
  process.stdout.write(`\x1b]777;notify;${escapeOsc(title)};${escapeOsc(body)}\x07`);
}

export default function (pi: ExtensionAPI) {
  const message = process.env.PI_BELL_MESSAGE || "Ready for your next prompt.";

  pi.on("agent_end", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    notify("Pi", message);
  });
}
