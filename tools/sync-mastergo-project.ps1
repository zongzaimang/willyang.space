[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^\d{6}-[a-z0-9-]+$')][string]$ProjectId,
  [Parameter(Mandatory)][string]$Source,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$arguments = @((Join-Path $PSScriptRoot 'project.mjs'), 'import', $ProjectId, $Source)
if ($Apply) { $arguments += '--apply' }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw 'Project import failed. The current published artifact has not changed.' }
