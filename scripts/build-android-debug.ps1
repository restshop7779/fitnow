$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $Root "android"
$JdkRoot = Join-Path $Root ".tools\jdk-21"
$SdkRoot = Join-Path $Root ".tools\android-sdk"

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

& .\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$Apk = Get-ChildItem "app\build\outputs\apk\debug\*.apk" | Select-Object -First 1
Write-Host "Android debug APK: $($Apk.FullName)"
