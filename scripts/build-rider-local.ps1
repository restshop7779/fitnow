$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Node = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Vite = Join-Path $Root "node_modules\vite\bin\vite.js"
if (-not (Test-Path $Node)) {
  throw "Bundled Node.js was not found: $Node"
}

if (-not (Test-Path $Vite)) {
  throw "Vite was not found. Run the local pnpm install first."
}

Set-Location $Root
& $Node $Vite build --emptyOutDir
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$ReactEntry = Join-Path $Root "dist\index.react.html"
$NativeEntry = Join-Path $Root "dist\index.html"
if (-not (Test-Path $ReactEntry)) {
  throw "React entry was not built: $ReactEntry"
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Html = [System.IO.File]::ReadAllText($ReactEntry, [System.Text.Encoding]::UTF8)
$Html = $Html.Replace("<title>FitNow</title>", "<title>FitNow Rider</title>")
$Html = $Html.Replace("<body>", '<body class="rider-app-entry"><script>window.FITNOW_APP_MODE="rider";</script>')
[System.IO.File]::WriteAllText($NativeEntry, $Html, $Utf8NoBom)

Write-Host "Rider web build complete: dist\index.html"
