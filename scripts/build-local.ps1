$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Node = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Vite = Join-Path $Root "node_modules\.pnpm\vite@8.0.14\node_modules\vite\bin\vite.js"
$Hero = Join-Path $Root "assets\fashion-delivery-hero.png"
$DistHeroDir = Join-Path $Root "dist\assets"
$StandalonePreview = Join-Path $Root "standalone-preview.html"
$DistPreview = Join-Path $Root "dist\index.react.html"
$EnvFile = Join-Path $Root ".env"

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

New-Item -ItemType Directory -Force -Path $DistHeroDir | Out-Null
Copy-Item -LiteralPath $Hero -Destination (Join-Path $DistHeroDir "fashion-delivery-hero.png") -Force
$PreviewHtml = Get-Content -LiteralPath $StandalonePreview -Raw -Encoding UTF8
if (Test-Path $EnvFile) {
  $EnvValues = @{}
  Get-Content -LiteralPath $EnvFile -Encoding UTF8 | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)\s*$') {
      $EnvValues[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
  if ($EnvValues.ContainsKey("VITE_SUPABASE_URL")) {
    $PreviewHtml = $PreviewHtml.Replace("__SUPABASE_URL__", $EnvValues["VITE_SUPABASE_URL"])
  }
  if ($EnvValues.ContainsKey("VITE_SUPABASE_ANON_KEY")) {
    $PreviewHtml = $PreviewHtml.Replace("__SUPABASE_ANON_KEY__", $EnvValues["VITE_SUPABASE_ANON_KEY"])
  }
}
Set-Content -LiteralPath $DistPreview -Value $PreviewHtml -Encoding UTF8

Write-Host "Build complete: dist\index.react.html"
