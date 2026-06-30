$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $Root "android"
$JdkRoot = Join-Path $Root ".tools\jdk-21"
$SdkRoot = Join-Path $Root ".tools\android-sdk"
$CapConfig = Join-Path $Root "capacitor.config.json"
$BuildGradle = Join-Path $Root "android\app\build.gradle"
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

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$OriginalCapConfig = [System.IO.File]::ReadAllText($CapConfig, [System.Text.Encoding]::UTF8)
$OriginalBuildGradle = [System.IO.File]::ReadAllText($BuildGradle, [System.Text.Encoding]::UTF8)

try {
  $RiderCapConfig = @'
{
  "appId": "com.fitnow.rider",
  "appName": "FitNow Rider",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https"
  }
}
'@
  [System.IO.File]::WriteAllText($CapConfig, $RiderCapConfig, $Utf8NoBom)

  Set-Location $Root
  & corepack pnpm run build:rider:local
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & corepack pnpm exec cap sync android
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $Gradle = [System.IO.File]::ReadAllText($BuildGradle, [System.Text.Encoding]::UTF8)
  $Gradle = $Gradle -replace 'applicationId "com\.fitnow\.app"', 'applicationId "com.fitnow.rider"'
  $Gradle = $Gradle -replace 'versionCode \d+', 'versionCode 1'
  $Gradle = $Gradle -replace 'versionName "[^"]+"', 'versionName "0.1.0"'
  [System.IO.File]::WriteAllText($BuildGradle, $Gradle, $Utf8NoBom)

  Set-Location $AndroidDir
  if (Test-Path "local.properties") {
    Remove-Item "local.properties" -Force
  }

  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $Apk = Get-ChildItem "app\build\outputs\apk\debug\*.apk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $RiderApk = Join-Path $Apk.Directory.FullName "fitnow-rider-debug.apk"
  $StableRiderApk = Join-Path $DistApkDir "fitnow-rider-debug.apk"
  New-Item -ItemType Directory -Path $DistApkDir -Force | Out-Null
  if ([System.IO.Path]::GetFullPath($Apk.FullName) -ne [System.IO.Path]::GetFullPath($RiderApk)) {
    Copy-Item -Path $Apk.FullName -Destination $RiderApk -Force
  }
  Copy-Item -Path $Apk.FullName -Destination $StableRiderApk -Force
  Write-Host "FitNow Rider debug APK: $RiderApk"
  Write-Host "FitNow Rider stable APK: $StableRiderApk"
}
finally {
  [System.IO.File]::WriteAllText($CapConfig, $OriginalCapConfig, $Utf8NoBom)
  [System.IO.File]::WriteAllText($BuildGradle, $OriginalBuildGradle, $Utf8NoBom)
}
