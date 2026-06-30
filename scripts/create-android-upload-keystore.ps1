$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$JdkRoot = Join-Path $Root ".tools\jdk-21"
$Keytool = Join-Path $JdkRoot "bin\keytool.exe"
$SecretsDir = Join-Path $Root ".secrets"
$KeystorePath = Join-Path $SecretsDir "fitnow-upload.jks"
$EnvPath = Join-Path $SecretsDir "android-release-env.ps1"
$Alias = "fitnow-upload"

if (-not (Test-Path $Keytool)) {
  throw "keytool was not found: $Keytool"
}

if (Test-Path $KeystorePath) {
  throw "Upload keystore already exists: $KeystorePath"
}

New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null

function New-SecretText {
  param([int]$Length = 32)

  $Chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".ToCharArray()
  $Bytes = New-Object byte[] $Length
  $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $Generator.GetBytes($Bytes)
  } finally {
    $Generator.Dispose()
  }
  $Result = New-Object System.Text.StringBuilder
  foreach ($Byte in $Bytes) {
    [void]$Result.Append($Chars[$Byte % $Chars.Length])
  }
  return $Result.ToString()
}

$StorePassword = New-SecretText
$KeyPassword = $StorePassword

& $Keytool `
  -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore $KeystorePath `
  -alias $Alias `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass $StorePassword `
  -keypass $KeyPassword `
  -dname "CN=FitNow Upload, OU=FitNow, O=FitNow, L=Seoul, ST=Seoul, C=KR"

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$EnvContent = @"
`$env:FITNOW_ANDROID_KEYSTORE=(Resolve-Path (Join-Path `$PSScriptRoot "fitnow-upload.jks")).Path
`$env:FITNOW_ANDROID_KEYSTORE_PASSWORD="$StorePassword"
`$env:FITNOW_ANDROID_KEY_ALIAS="$Alias"
`$env:FITNOW_ANDROID_KEY_PASSWORD="$KeyPassword"
"@
[System.IO.File]::WriteAllText($EnvPath, $EnvContent, $Utf8NoBom)

$ReadmePath = Join-Path $SecretsDir "README.txt"
$Readme = @"
FitNow Android upload key files

Generated files:
- fitnow-upload.jks: Android upload keystore
- android-release-env.ps1: local environment variables for release signing

Keep this folder private. Do not commit it, upload it to chat, or send it through messengers.
Back it up to a secure password manager or encrypted drive before publishing to an app store.

To build signed release bundles in this workspace:
  . .\.secrets\android-release-env.ps1
  corepack pnpm run android:bundle
  corepack pnpm run android:rider:bundle
"@
[System.IO.File]::WriteAllText($ReadmePath, $Readme, $Utf8NoBom)

Write-Host "Android upload keystore created: $KeystorePath"
Write-Host "Release signing env loader created: $EnvPath"
