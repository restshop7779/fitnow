$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $Root "android"
$JdkRoot = Join-Path $Root ".tools\jdk-21"
$SdkRoot = Join-Path $Root ".tools\android-sdk"
$DistApkDir = Join-Path $Root "dist-apks"

if (-not (Test-Path (Join-Path $JdkRoot "bin\java.exe"))) {
  throw "JDK 21 was not found: $JdkRoot"
}

if (-not (Test-Path (Join-Path $SdkRoot "platform-tools\adb.exe"))) {
  throw "Android SDK was not found: $SdkRoot"
}

$env:JAVA_HOME = $JdkRoot
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:Path = "$JdkRoot\bin;$SdkRoot\cmdline-tools\latest\bin;$SdkRoot\platform-tools;$env:Path"

Set-Location $Root
& corepack pnpm run build:local
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& corepack pnpm exec cap sync android
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Set-Location $AndroidDir
if (Test-Path "local.properties") {
  Remove-Item "local.properties" -Force
}

& .\gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$Bundle = Get-ChildItem "app\build\outputs\bundle\release\*.aab" | Select-Object -First 1
$StableBundle = Join-Path $DistApkDir "fitnow-release.aab"
New-Item -ItemType Directory -Path $DistApkDir -Force | Out-Null
Copy-Item -Path $Bundle.FullName -Destination $StableBundle -Force
Write-Host "Android release bundle: $($Bundle.FullName)"
Write-Host "Android stable release bundle: $StableBundle"
if (-not ($env:FITNOW_ANDROID_KEYSTORE -and $env:FITNOW_ANDROID_KEYSTORE_PASSWORD -and $env:FITNOW_ANDROID_KEY_ALIAS -and $env:FITNOW_ANDROID_KEY_PASSWORD)) {
  Write-Warning "Release bundle was built without upload-key signing. Set FITNOW_ANDROID_KEYSTORE, FITNOW_ANDROID_KEYSTORE_PASSWORD, FITNOW_ANDROID_KEY_ALIAS, and FITNOW_ANDROID_KEY_PASSWORD before store upload."
}
