<#
.SYNOPSIS
Generates canonical static project URLs from content/projects.json.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $root 'project.html'
$projectsPath = Join-Path $root 'content\projects.json'
$template = [IO.File]::ReadAllText($templatePath)
$projects = Get-Content -Raw $projectsPath | ConvertFrom-Json

foreach ($project in $projects) {
  if (-not $project.slug -or $null -eq $project.detailId) {
    throw "Project '$($project.id)' needs both slug and detailId."
  }

  $page = $template.Replace('<head>', "<head>`n<base href=`"/`">`n<script>window.__projectId='$($project.detailId)';</script>")
  $folder = Join-Path $root $project.slug
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  [IO.File]::WriteAllText((Join-Path $folder 'index.html'), $page, [Text.UTF8Encoding]::new($false))
}

# Preserve the first published URL so any old bookmarks continue to work.
$legacyFolder = Join-Path $root '240129-nitecore-hc65-uhe'
New-Item -ItemType Directory -Force -Path $legacyFolder | Out-Null
[IO.File]::WriteAllText((Join-Path $legacyFolder 'index.html'), '<!doctype html><meta http-equiv="refresh" content="0; url=/nitecore-hc65-uhe/"><link rel="canonical" href="https://willyang.space/nitecore-hc65-uhe/">', [Text.UTF8Encoding]::new($false))

Write-Host "Generated $($projects.Count) canonical project page(s)."

