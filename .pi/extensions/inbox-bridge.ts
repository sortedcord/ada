import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

export default function (pi: ExtensionAPI) {
  // Inbox path in project directory: .pi/inbox.jsonl
  const inboxFile = path.resolve(process.cwd(), ".pi/inbox.jsonl");

  // Ensure file exists
  if (!fs.existsSync(inboxFile)) {
    try {
      fs.writeFileSync(inboxFile, "", "utf-8");
    } catch {
      // ignore
    }
  }

  const checkInbox = () => {
    if (!fs.existsSync(inboxFile)) return;
    try {
      const content = fs.readFileSync(inboxFile, "utf-8").trim();
      if (!content) return;

      // Truncate immediately to avoid re-reading
      fs.writeFileSync(inboxFile, "", "utf-8");

      const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        let msg = line;
        try {
          const parsed = JSON.parse(line);
          if (typeof parsed.message === "string") {
            msg = parsed.message;
          }
        } catch {
          // plain string
        }

        if (msg) {
          console.log(`\n[inbox-bridge] Received prompt from web UI: "${msg}"`);
          try {
            pi.sendUserMessage(msg, { deliverAs: "followUp" });
          } catch {
            try {
              pi.sendUserMessage(msg);
            } catch (err: any) {
              console.error(`[inbox-bridge] Failed to dispatch user message: ${err?.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`[inbox-bridge] Error checking inbox: ${err?.message}`);
    }
  };

  // Poll regularly every 1.5 seconds so it never misses a write and doesn't rely on OS file event edge cases
  const timer = setInterval(checkInbox, 1500);

  // Also watch the file directly
  let watcher: fs.FSWatcher | undefined;
  try {
    watcher = fs.watch(inboxFile, () => {
      checkInbox();
    });
  } catch {
    // polling fallback is active
  }

  pi.on("session_shutdown", () => {
    clearInterval(timer);
    watcher?.close();
  });
}
