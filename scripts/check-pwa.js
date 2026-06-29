const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function assertFile(relativePath) {
  const fullPath = path.join(dist, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing dist asset: ${relativePath}`);
  }
  return fullPath;
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label} does not include ${needle}`);
  }
}

const html = fs.readFileSync(assertFile("index.react.html"), "utf8");
assertIncludes(html, "manifest.webmanifest", "index.react.html");
assertIncludes(html, "apple-mobile-web-app-capable", "index.react.html");
assertIncludes(html, "serviceWorker", "index.react.html");

const manifest = JSON.parse(fs.readFileSync(assertFile("manifest.webmanifest"), "utf8"));
if (manifest.display !== "standalone") {
  throw new Error(`Expected standalone display, got ${manifest.display}`);
}
if (!manifest.start_url || !manifest.scope) {
  throw new Error("Manifest must include start_url and scope");
}

const requiredIcons = new Set(["192x192", "512x512"]);
for (const icon of manifest.icons || []) {
  if (!icon.src || !icon.sizes || !icon.type) continue;
  requiredIcons.delete(icon.sizes);
  assertFile(icon.src.replace(/^\.\//, ""));
}
if (requiredIcons.size) {
  throw new Error(`Manifest missing icon sizes: ${Array.from(requiredIcons).join(", ")}`);
}

const serviceWorker = fs.readFileSync(assertFile("sw.js"), "utf8");
assertIncludes(serviceWorker, "install", "sw.js");
assertIncludes(serviceWorker, "fetch", "sw.js");
assertIncludes(serviceWorker, "fitnow-icon-192.png", "sw.js");
assertIncludes(serviceWorker, "fitnow-icon-512.png", "sw.js");

console.log("[pwa] OK: manifest, icons, apple install metadata, service worker");
