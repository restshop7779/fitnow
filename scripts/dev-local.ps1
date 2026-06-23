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
& $Node $Vite --host 127.0.0.1 --port 5173
