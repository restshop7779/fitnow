$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$MainBundle = Join-Path $Root "dist-apks\fitnow-release.aab"
$RiderBundle = Join-Path $Root "dist-apks\fitnow-rider-release.aab"
$BuildGradle = Join-Path $Root "android\app\build.gradle"
$RiderReleaseScript = Join-Path $Root "scripts\build-android-rider-release-bundle.ps1"

function Test-ZipEntry {
  param(
    [string]$Path,
    [string]$EntryName
  )

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $Zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    return $null -ne ($Zip.Entries | Where-Object { $_.FullName -eq $EntryName } | Select-Object -First 1)
  } finally {
    $Zip.Dispose()
  }
}

function Test-BundleStructure {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path $Path)) {
    throw "Missing release bundle: $Path"
  }

  $RequiredEntries = @(
    "BundleConfig.pb",
    "base/manifest/AndroidManifest.xml",
    "base/dex/classes.dex",
    "META-INF/MANIFEST.MF"
  )

  foreach ($Entry in $RequiredEntries) {
    if (-not (Test-ZipEntry -Path $Path -EntryName $Entry)) {
      throw "$Label bundle is missing $Entry"
    }
  }

  $Size = (Get-Item $Path).Length
  if ($Size -lt 1000000) {
    throw "$Label bundle looks too small: $Size bytes"
  }

  Write-Host "[release-bundle] OK structure: $Label $([System.IO.Path]::GetFileName($Path)) $Size bytes"
}

function Test-TextIncludes {
  param(
    [string]$Path,
    [string]$Needle,
    [string]$Label
  )

  $Text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
  if (-not $Text.Contains($Needle)) {
    throw "$Label does not include $Needle"
  }
}

Test-BundleStructure -Path $MainBundle -Label "FitNow"
Test-BundleStructure -Path $RiderBundle -Label "FitNow Rider"

Test-TextIncludes -Path $BuildGradle -Needle 'applicationId "com.fitnow.app"' -Label "android/app/build.gradle"
Test-TextIncludes -Path $BuildGradle -Needle 'versionCode 2' -Label "android/app/build.gradle"
Test-TextIncludes -Path $BuildGradle -Needle 'versionName "1.0.1"' -Label "android/app/build.gradle"

Test-TextIncludes -Path $RiderReleaseScript -Needle '"appId": "com.fitnow.rider"' -Label "rider release script"
Test-TextIncludes -Path $RiderReleaseScript -Needle '"appName": "FitNow Rider"' -Label "rider release script"
Test-TextIncludes -Path $RiderReleaseScript -Needle 'versionCode 1' -Label "rider release script"
Test-TextIncludes -Path $RiderReleaseScript -Needle 'versionName "0.1.0"' -Label "rider release script"

Write-Host "[release-bundle] OK metadata: main com.fitnow.app 1.0.1 (2), rider com.fitnow.rider 0.1.0 (1)"
