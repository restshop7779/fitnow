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
if (Test-Path $ReactEntry) {
  Copy-Item -Path $ReactEntry -Destination $NativeEntry -Force
}

Write-Host "Build complete: dist\index.react.html"
Write-Host "Native entry complete: dist\index.html"
