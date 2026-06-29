const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing native file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label} does not include ${needle}`);
  }
}

const capacitorConfig = JSON.parse(read("capacitor.config.json"));
if (capacitorConfig.appId !== "com.fitnow.app") {
  throw new Error(`Unexpected Capacitor appId: ${capacitorConfig.appId}`);
}
if (capacitorConfig.appName !== "FitNow") {
  throw new Error(`Unexpected Capacitor appName: ${capacitorConfig.appName}`);
}
if (capacitorConfig.webDir !== "dist") {
  throw new Error(`Unexpected Capacitor webDir: ${capacitorConfig.webDir}`);
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
  throw new Error("Info.plist should remain portrait-only for the current FitNow shell");
}

const nativeAndroidEntry = path.join(root, "android/app/src/main/assets/public/index.html");
const nativeIosEntry = path.join(root, "ios/App/App/public/index.html");
if (!fs.existsSync(nativeAndroidEntry) || !fs.existsSync(nativeIosEntry)) {
  throw new Error("Run `pnpm run cap:sync` before native release checks");
}

console.log("[native] OK: Capacitor config, Android/iOS shell, permissions, synced web entry");
