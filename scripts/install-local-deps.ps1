$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Node = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Pnpm = Join-Path $Root ".tools\pnpm-exe\package\dist\pnpm.mjs"

if (-not (Test-Path $Node)) {
  throw "Bundled Node.js was not found: $Node"
}

if (-not (Test-Path $Pnpm)) {
  throw "Local pnpm was not found: $Pnpm"
}

Set-Location $Root
& $Node $Pnpm install
