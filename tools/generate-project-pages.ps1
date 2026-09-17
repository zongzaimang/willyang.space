<# Regenerates the static site from the shared template and project registry. #>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'build-site.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Static page generation failed.' }
