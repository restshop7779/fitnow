$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $Root "android"
$JdkRoot = Join-Path $Root ".tools\jdk-21"
$SdkRoot = Join-Path $Root ".tools\android-sdk"
$CapConfig = Join-Path $Root "capacitor.config.json"
$BuildGradle = Join-Path $Root "android\app\build.gradle"
$StringsXml = Join-Path $Root "android\app\src\main\res\values\strings.xml"
$CordovaConfigXml = Join-Path $Root "android\app\src\main\res\xml\config.xml"
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
$OriginalStringsXml = [System.IO.File]::ReadAllText($StringsXml, [System.Text.Encoding]::UTF8)
$OriginalCordovaConfigXml = [System.IO.File]::ReadAllText($CordovaConfigXml, [System.Text.Encoding]::UTF8)

function Backup-LauncherIcons {
  param([string]$RootPath)

  $Backup = @{}
  Get-ChildItem (Join-Path $RootPath "android\app\src\main\res") -Recurse -File -Include "ic_launcher*.png", "ic_launcher_background.xml" | ForEach-Object {
    $Backup[$_.FullName] = [System.IO.File]::ReadAllBytes($_.FullName)
  }
  return $Backup
}

function Restore-LauncherIcons {
  param([hashtable]$Backup)

  foreach ($Path in $Backup.Keys) {
    [System.IO.File]::WriteAllBytes($Path, $Backup[$Path])
  }
}

function Save-RiderIcon {
  param(
    [string]$Path,
    [int]$Size,
    [bool]$Round
  )

  Add-Type -AssemblyName System.Drawing

  $Bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $Background = [System.Drawing.ColorTranslator]::FromHtml("#0F172A")
  $Accent = [System.Drawing.ColorTranslator]::FromHtml("#22C55E")
  $Route = [System.Drawing.ColorTranslator]::FromHtml("#38BDF8")
  $White = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")

  $Graphics.Clear([System.Drawing.Color]::Transparent)
  $ShapeBrush = New-Object System.Drawing.SolidBrush $Background
  if ($Round) {
    $Graphics.FillEllipse($ShapeBrush, 0, 0, $Size, $Size)
  } else {
    $Radius = [Math]::Max(8, [int]($Size * 0.2))
    $PathShape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $Rect = New-Object System.Drawing.Rectangle 0, 0, ($Size - 1), ($Size - 1)
    $PathShape.AddArc($Rect.X, $Rect.Y, $Radius, $Radius, 180, 90)
    $PathShape.AddArc(($Rect.Right - $Radius), $Rect.Y, $Radius, $Radius, 270, 90)
    $PathShape.AddArc(($Rect.Right - $Radius), ($Rect.Bottom - $Radius), $Radius, $Radius, 0, 90)
    $PathShape.AddArc($Rect.X, ($Rect.Bottom - $Radius), $Radius, $Radius, 90, 90)
    $PathShape.CloseFigure()
    $Graphics.FillPath($ShapeBrush, $PathShape)
    $PathShape.Dispose()
  }

  $PenWidth = [Math]::Max(3, [int]($Size * 0.055))
  $RoutePen = New-Object System.Drawing.Pen $Route, $PenWidth
  $RoutePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $RoutePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $Graphics.DrawBezier($RoutePen, ($Size * 0.18), ($Size * 0.7), ($Size * 0.38), ($Size * 0.26), ($Size * 0.62), ($Size * 0.82), ($Size * 0.82), ($Size * 0.34))

  $AccentBrush = New-Object System.Drawing.SolidBrush $Accent
  $DotSize = [Math]::Max(8, [int]($Size * 0.16))
  $Graphics.FillEllipse($AccentBrush, ($Size * 0.12), ($Size * 0.62), $DotSize, $DotSize)
  $Graphics.FillEllipse($AccentBrush, ($Size * 0.74), ($Size * 0.22), $DotSize, $DotSize)

  $FontSize = [Math]::Max(18, [int]($Size * 0.42))
  $Font = New-Object System.Drawing.Font "Arial", $FontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $TextBrush = New-Object System.Drawing.SolidBrush $White
  $StringFormat = New-Object System.Drawing.StringFormat
  $StringFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $StringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  $TextRect = New-Object System.Drawing.RectangleF 0, ($Size * 0.15), $Size, ($Size * 0.72)
  $Graphics.DrawString("R", $Font, $TextBrush, $TextRect, $StringFormat)

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $StringFormat.Dispose()
  $TextBrush.Dispose()
  $Font.Dispose()
  $AccentBrush.Dispose()
  $RoutePen.Dispose()
  $ShapeBrush.Dispose()
  $Graphics.Dispose()
  $Bitmap.Dispose()
}

function Set-RiderLauncherIcons {
  param([string]$RootPath)

  $SizeByDensity = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
  }

  foreach ($Density in $SizeByDensity.Keys) {
    $Dir = Join-Path $RootPath "android\app\src\main\res\$Density"
    if (-not (Test-Path $Dir)) {
      continue
    }
    $Size = $SizeByDensity[$Density]
    Save-RiderIcon -Path (Join-Path $Dir "ic_launcher.png") -Size $Size -Round $false
    Save-RiderIcon -Path (Join-Path $Dir "ic_launcher_round.png") -Size $Size -Round $true
    Save-RiderIcon -Path (Join-Path $Dir "ic_launcher_foreground.png") -Size $Size -Round $true
  }

  $LauncherBackground = Join-Path $RootPath "android\app\src\main\res\values\ic_launcher_background.xml"
  $LauncherBackgroundXml = @'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0F172A</color>
</resources>
'@
  [System.IO.File]::WriteAllText($LauncherBackground, $LauncherBackgroundXml, $Utf8NoBom)
}

function Set-RiderAndroidLabels {
  param([string]$Path)

  $RiderStrings = @'
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">FitNow Rider</string>
    <string name="title_activity_main">FitNow Rider</string>
    <string name="package_name">com.fitnow.rider</string>
    <string name="custom_url_scheme">com.fitnow.rider</string>
</resources>
'@
  [System.IO.File]::WriteAllText($Path, $RiderStrings, $Utf8NoBom)
}

$OriginalLauncherIcons = Backup-LauncherIcons -RootPath $Root

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

  Set-RiderLauncherIcons -RootPath $Root
  Set-RiderAndroidLabels -Path $StringsXml

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
  [System.IO.File]::WriteAllText($StringsXml, $OriginalStringsXml, $Utf8NoBom)
  [System.IO.File]::WriteAllText($CordovaConfigXml, $OriginalCordovaConfigXml, $Utf8NoBom)
  Restore-LauncherIcons -Backup $OriginalLauncherIcons
}
