import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const server = read("apps-script/google-calendar/Code.gs");
const html = read("apps-script/google-calendar/Index.html");
const manifest = JSON.parse(read("apps-script/google-calendar/appsscript.json"));

new vm.Script(server, { filename: "Code.gs" });
const scriptTag = html.match(/<script>([\\s\\S]*?)<\\/script>/i);
if (!scriptTag) throw new Error("Apps Script bridge HTML has no inline script.");
const clientScript = scriptTag[1]
  .replace(/<\\?!=\\s*JSON\\.stringify\\(bridgeNonce\\)\\s*\\?>/g, '"test-nonce"')
  .replace(/<\\?!=\\s*JSON\\.stringify\\(alfredOrigin\\)\\s*\\?>/g, '"https://bm000001.github.io"');
new vm.Script(clientScript, { filename: "Index.html inline script" });

if (manifest.webapp?.executeAs !== "USER_ACCESSING") {
  throw new Error("Apps Script must execute as the user accessing the web app.");
}
if (!manifest.oauthScopes?.includes("https://www.googleapis.com/auth/calendar.events") ||
    !manifest.oauthScopes?.includes("https://www.googleapis.com/auth/calendar.calendarlist.readonly")) {
  throw new Error("Required least-privilege Calendar scopes are missing.");
}
if (!server.includes('case "session"') || !server.includes('case "deleteEvent"') ||
    !server.includes("ScriptApp.getOAuthToken()")) {
  throw new Error("Apps Script RPC dispatcher is incomplete.");
}
if (!html.includes("event.source !== openerWindow") || !html.includes("event.origin !== ALFRED_ORIGIN")) {
  throw new Error("Apps Script message origin/source validation is missing.");
}
console.log("Google Apps Script manifest, RPC bridge and JavaScript syntax validated.");
