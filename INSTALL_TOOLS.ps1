$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $PSScriptRoot ".tools\installers"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$installers = @(
  @{
    Name = "Node.js LTS"
    File = "node-lts.msi"
    Url = "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi"
    Args = "/i `"{0}`" /passive /norestart"
    Type = "msiexec"
  },
  @{
    Name = "Git for Windows"
    File = "git-setup.exe"
    Url = "https://github.com/git-for-windows/git/releases/download/v2.49.0.windows.1/Git-2.49.0-64-bit.exe"
    Args = "/VERYSILENT /NORESTART /NOCANCEL /SP-"
    Type = "exe"
  },
  @{
    Name = "Visual Studio Code"
    File = "vscode-user-setup.exe"
    Url = "https://update.code.visualstudio.com/latest/win32-x64-user/stable"
    Args = "/VERYSILENT /NORESTART /MERGETASKS=!runcode"
    Type = "exe"
  }
)

foreach ($installer in $installers) {
  $target = Join-Path $InstallDir $installer.File
  Write-Host "Downloading $($installer.Name)..."
  Invoke-WebRequest -Uri $installer.Url -OutFile $target

  Write-Host "Installing $($installer.Name)..."
  if ($installer.Type -eq "msiexec") {
    $args = [string]::Format($installer.Args, $target)
    Start-Process -FilePath "msiexec.exe" -ArgumentList $args -Wait
  } else {
    Start-Process -FilePath $target -ArgumentList $installer.Args -Wait
  }
}

Write-Host ""
Write-Host "Install finished. Close and reopen PowerShell, then check:"
Write-Host "node -v"
Write-Host "npm -v"
Write-Host "git --version"
Write-Host "code --version"
