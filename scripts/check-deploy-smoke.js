const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const htmlPath = path.join(distDir, "index.react.html");
const privacyPath = path.join(distDir, "privacy.html");

function fail(message) {
  console.error("[deploy-smoke] " + message);
  process.exitCode = 1;
}

function readRequired(filePath, label) {
  if (!existsSync(filePath)) {
    fail(label + " missing: " + path.relative(root, filePath));
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function hasConflictMarker(text) {
  return text.includes("<<<<<<<") || text.includes("=======") || text.includes(">>>>>>>");
}

function assetPathFromRef(ref) {
  const cleanRef = ref.split("?")[0].replace(/^\.\//, "");
  return path.join(distDir, cleanRef);
}

const html = readRequired(htmlPath, "deploy html");
if (!html) process.exit(1);
if (hasConflictMarker(html)) fail("deploy html contains git conflict markers");

const privacyHtml = readRequired(privacyPath, "privacy policy html");
if (privacyHtml && hasConflictMarker(privacyHtml)) fail("privacy policy html contains git conflict markers");
if (privacyHtml && !privacyHtml.includes("개인정보처리방침")) fail("privacy policy html missing policy title");

const scriptRefs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/g)].map((match) => match[1]);
const localScriptRefs = scriptRefs.filter((ref) => !/^https?:\/\//i.test(ref));
const moduleScriptRef = localScriptRefs.find((ref) => /assets\/index\.react-[^/]+\.js$/.test(ref));
if (!moduleScriptRef) fail("deploy html does not reference a built index.react asset");

const cssRefs = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/g)].map((match) => match[1]);
const imgRefs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g)].map((match) => match[1]);
const localRefs = [...localScriptRefs, ...cssRefs, ...imgRefs].filter((ref) => !/^https?:\/\//i.test(ref));
localRefs.forEach((ref) => {
  const assetPath = assetPathFromRef(ref);
  if (!existsSync(assetPath)) fail("referenced asset missing: " + ref);
});

const jsPath = moduleScriptRef ? assetPathFromRef(moduleScriptRef) : "";
const js = jsPath ? readRequired(jsPath, "deploy javascript") : "";
if (js && hasConflictMarker(js)) fail("deploy javascript contains git conflict markers");
if (jsPath && existsSync(jsPath)) {
  const syntaxCheck = spawnSync(process.execPath, ["--check", jsPath], { encoding: "utf8" });
  if (syntaxCheck.status !== 0) {
    fail("deploy javascript syntax check failed\n" + (syntaxCheck.stderr || syntaxCheck.stdout || "").trim());
  }
}

cssRefs
  .filter((ref) => !/^https?:\/\//i.test(ref))
  .map(assetPathFromRef)
  .forEach((cssPath) => {
    const css = readRequired(cssPath, "deploy stylesheet");
    if (css && hasConflictMarker(css)) fail("deploy stylesheet contains git conflict markers: " + path.basename(cssPath));
  });

const requiredInlineClicks = [
  "goHome()",
  "openLooks()",
  "openMyPage()",
  "openCartDetail()",
];
requiredInlineClicks.forEach((handler) => {
  if (!html.includes('onclick="' + handler + '"') && !html.includes("onclick=\"" + handler.replace("()", "("))) {
    fail("home inline click missing: " + handler);
  }
});

const requiredWindowHandlers = [
  "goHome",
  "openLooks",
  "openMyPage",
  "openCartDetail",
  "openDetail",
];
requiredWindowHandlers.forEach((handler) => {
  const exposedPattern = new RegExp(handler + "\\s*:");
  if (!exposedPattern.test(js)) fail("window handler not exposed in bundle: " + handler);
});

if (!process.exitCode) {
  console.log("[deploy-smoke] OK: " + path.relative(root, htmlPath));
  console.log("[deploy-smoke] JS: " + moduleScriptRef);
  console.log("[deploy-smoke] Checked handlers: " + requiredWindowHandlers.join(", "));
}
