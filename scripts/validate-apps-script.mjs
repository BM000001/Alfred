import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const server = read("apps-script/google-calendar/Code.gs");
const html = read("apps-script/google-calendar/Index.html");
const manifest = JSON.parse(read("apps-script/google-calendar/appsscript.json"));

new vm.Script(server, { filename: "Code.gs" });
const scriptTag = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptTag) throw new Error("Apps Script bridge HTML has no inline script.");
const clientScript = scriptTag[1]
  .replace(/<\?!=\s*JSON\.stringify\(bridgeNonce\)\s*\?>/g, '"test-nonce"')
  .replace(/<\?!=\s*JSON\.stringify\(alfredOrigin\)\s*\?>/g, '"https://bm000001.github.io"');
new vm.Script(clientScript, { filename: "Index.html inline script" });

if (manifest.webapp?.executeAs !== "USER_ACCESSING" || manifest.webapp?.access !== "MYSELF") {
  throw new Error("Apps Script must execute as the accessing user and remain private to the script owner.");
}
if (!manifest.oauthScopes?.includes("https://www.googleapis.com/auth/calendar.events") ||
    !manifest.oauthScopes?.includes("https://www.googleapis.com/auth/calendar.calendarlist.readonly")) {
  throw new Error("Required least-privilege Calendar scopes are missing.");
}
if (!manifest.urlFetchWhitelist?.includes("https://www.googleapis.com/") ||
    !manifest.urlFetchWhitelist?.includes("https://openidconnect.googleapis.com/")) {
  throw new Error("Apps Script outbound URL allowlist is incomplete.");
}
if (!manifest.dependencies?.enabledAdvancedServices?.some((service) =>
  service.userSymbol === "Calendar" && service.serviceId === "calendar" && service.version === "v3")) {
  throw new Error("Google Calendar API v3 must be enabled for the Apps Script project.");
}
if (!server.includes('case "session"') || !server.includes('case "deleteEvent"') ||
    !server.includes("ScriptApp.getOAuthToken()") ||
    !server.includes("ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL)")) {
  throw new Error("Apps Script RPC dispatcher is incomplete.");
}
if (!html.includes("event.source !== openerWindow") || !html.includes("event.origin !== ALFRED_ORIGIN") ||
    !html.includes("window.top") || !html.includes("topWindow.opener") ||
    !read("src/modules/agenda/googleCalendarApi.ts").includes("function isPopupFrame")) {
  throw new Error("Apps Script message origin/source validation is missing.");
}
if (/Logger\.log|PropertiesService|CacheService|SpreadsheetApp/.test(server) ||
    html.includes("getOAuthToken") || html.includes("Authorization: Bearer")) {
  throw new Error("Apps Script bridge must not log or persist tokens/event payloads or expose OAuth tokens to HTML.");
}
console.log("Google Apps Script manifest, sandbox opener handshake, RPC bridge and JavaScript syntax validated.");


// Runtime contract test: HtmlService's inner frame has no opener, but its
// top-level Apps Script tab must retain the Alfred opener.
const emitted = [];
let messageHandler = null;
let dispatched = null;
let successHandler = null;
const statusNode = { textContent: "" };
const alfredWindow = {
  closed: false,
  postMessage(message, targetOrigin) { emitted.push({ message, targetOrigin }); },
};
const topWindow = { opener: alfredWindow };
const htmlWindow = {
  opener: null,
  top: topWindow,
  addEventListener(type, handler) { if (type === "message") messageHandler = handler; },
};
const scriptRunner = {
  withSuccessHandler(handler) { successHandler = handler; return this; },
  withFailureHandler() { return this; },
  rpcDispatch(request) { dispatched = request; successHandler({ connected: true }); return this; },
};
vm.runInNewContext(clientScript, {
  window: htmlWindow,
  document: { getElementById: () => statusNode },
  google: { script: { run: scriptRunner } },
});
if (!messageHandler || emitted[0]?.message?.type !== "ready" ||
    emitted[0]?.targetOrigin !== "https://bm000001.github.io") {
  throw new Error("Apps Script sandbox could not establish the opener handshake.");
}
messageHandler({
  origin: "https://bm000001.github.io",
  source: alfredWindow,
  data: {
    channel: "alfred-google-calendar",
    type: "rpc",
    nonce: "test-nonce",
    requestId: "test-request",
    request: { method: "session" },
  },
});
if (!dispatched || dispatched.method !== "session" ||
    emitted[1]?.message?.type !== "rpc-result" ||
    emitted[1]?.message?.requestId !== "test-request") {
  throw new Error("Apps Script bridge failed its RPC request/response contract.");
}
const callCount = emitted.length;
messageHandler({
  origin: "https://attacker.example",
  source: alfredWindow,
  data: { channel: "alfred-google-calendar", type: "rpc", nonce: "test-nonce", request: { method: "session" } },
});
if (emitted.length !== callCount) {
  throw new Error("Apps Script bridge accepted a message from an untrusted origin.");
}
messageHandler({
  origin: "https://bm000001.github.io",
  source: { closed: false, postMessage() {} },
  data: { channel: "alfred-google-calendar", type: "rpc", nonce: "test-nonce", requestId: "wrong-source", request: { method: "session" } },
});
messageHandler({
  origin: "https://bm000001.github.io",
  source: alfredWindow,
  data: { channel: "alfred-google-calendar", type: "rpc", nonce: "wrong-nonce", requestId: "wrong-nonce", request: { method: "session" } },
});
if (emitted.length !== callCount) {
  throw new Error("Apps Script bridge accepted an untrusted source or nonce.");
}
