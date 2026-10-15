param(
  [Parameter(Mandatory = $false)]
  [string]$Port
)

Write-Host "Starting InsightIQ AI Node Backend Server..."
Set-Location -Path $PSScriptRoot

if ($Port) {
  $env:PORT = $Port
}

node server.js
