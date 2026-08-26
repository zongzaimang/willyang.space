<#[
.SYNOPSIS
Copies a MasterGo website-page export into the portfolio asset directory.

.DESCRIPTION
The script is deliberately local-only: it validates, previews and copies files.
It never publishes to GitHub by itself. Run it after exporting all slices from
one MasterGo “网站” page, then ask Codex to review and publish the changes.

.EXAMPLE
.\tools\sync-mastergo-project.ps1 -ProjectId '240129-nitecore-hc65-uhe' -Source '.\mastergo-inbox\240129-nitecore-hc65-uhe'

.EXAMPLE
.\tools\sync-mastergo-project.ps1 -ProjectId '240129-nitecore-hc65-uhe' -Source '.\mastergo-inbox\240129-nitecore-hc65-uhe' -Apply
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^\d{6}-[a-z0-9-]+$')]
  [string]$ProjectId,

  [Parameter(Mandatory)]
  [string]$Source,

  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sourcePath = [IO.Path]::GetFullPath((Join-Path $root $Source))
$targetPath = Join-Path $root (Join-Path 'assets\projects' $ProjectId)
$allowedExtensions = @('.png', '.webp', '.jpg', '.jpeg')

if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
  throw "Export folder was not found: $sourcePath"
}

$files = Get-ChildItem -LiteralPath $sourcePath -File |
  Where-Object { $allowedExtensions -contains $_.Extension.ToLowerInvariant() -and $_.Name -match '^\d{2}-.+\.(png|webp|jpe?g)$' } |
  Sort-Object Name

if ($files.Count -eq 0) {
  throw 'No PNG, WebP, JPG, or JPEG images were found in the export folder.'
}

if (-not ($files.Name -match '^01-cover\.(png|webp|jpe?g)$')) {
  throw 'A cover file named 01-cover.png (or .webp/.jpg) is required.'
}

$duplicateOrders = $files | Group-Object { [int]$_.BaseName.Substring(0, 2) } | Where-Object Count -gt 1
if ($duplicateOrders) {
  $duplicates = ($duplicateOrders | ForEach-Object { $_.Group.Name -join ', ' }) -join '; '
  throw "Each image position needs one stable export file. Duplicate positions found: $duplicates"
}

$report = foreach ($file in $files) {
  $destination = Join-Path $targetPath $file.Name
  $state = if (-not (Test-Path -LiteralPath $destination)) {
    'new'
  } elseif ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash) {
    'unchanged'
  } else {
    'updated'
  }

  [PSCustomObject]@{
    Status = $state
    File = $file.Name
    SizeKB = [math]::Round($file.Length / 1KB, 1)
  }
}

$report | Format-Table -AutoSize

if (-not $Apply) {
  Write-Host "`nPreview only. Re-run with -Apply to copy changed files into: $targetPath" -ForegroundColor Yellow
  exit 0
}

New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
foreach ($row in $report | Where-Object Status -ne 'unchanged') {
  Copy-Item -LiteralPath (Join-Path $sourcePath $row.File) -Destination (Join-Path $targetPath $row.File) -Force
}

Write-Host "`nSynced $($report.Count) image(s) to: $targetPath" -ForegroundColor Green

