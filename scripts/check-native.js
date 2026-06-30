const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function fail(message) {
  if (process.env.GITHUB_ACTIONS) {
    console.error("::error file=scripts/check-native.js,title=Native shell check::" + message);
  }
  throw new Error(message);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing native file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    fail(`${label} does not include ${needle}`);
  }
}

const capacitorConfig = JSON.parse(read("capacitor.config.json"));
if (capacitorConfig.appId !== "com.fitnow.app") {
  fail(`Unexpected Capacitor appId: ${capacitorConfig.appId}`);
}
if (capacitorConfig.appName !== "FitNow") {
  fail(`Unexpected Capacitor appName: ${capacitorConfig.appName}`);
}
if (capacitorConfig.webDir !== "dist") {
  fail(`Unexpected Capacitor webDir: ${capacitorConfig.webDir}`);
}

const androidManifest = read("android/app/src/main/AndroidManifest.xml");
assertIncludes(androidManifest, 'android.permission.INTERNET', "AndroidManifest.xml");
assertIncludes(androidManifest, 'android.permission.CAMERA', "AndroidManifest.xml");
assertIncludes(androidManifest, 'android:screenOrientation="portrait"', "AndroidManifest.xml");
assertIncludes(androidManifest, 'android:label="@string/app_name"', "AndroidManifest.xml");

const androidStrings = read("android/app/src/main/res/values/strings.xml");
assertIncludes(androidStrings, "<string name=\"app_name\">FitNow</string>", "strings.xml");
assertIncludes(androidStrings, "<string name=\"package_name\">com.fitnow.app</string>", "strings.xml");

const iosInfo = read("ios/App/App/Info.plist");
assertIncludes(iosInfo, "NSCameraUsageDescription", "Info.plist");
assertIncludes(iosInfo, "NSPhotoLibraryUsageDescription", "Info.plist");
assertIncludes(iosInfo, "UIInterfaceOrientationPortrait", "Info.plist");
if (iosInfo.includes("UIInterfaceOrientationLandscapeLeft") || iosInfo.includes("UIInterfaceOrientationLandscapeRight")) {
  fail("Info.plist should remain portrait-only for the current FitNow shell");
}

const builtWebEntry = path.join(root, "dist/index.react.html");
if (!fs.existsSync(builtWebEntry)) {
  fail("Run `pnpm run build` before native shell checks");
}

console.log("[native] OK: Capacitor config, Android/iOS shell, permissions, built web entry");
