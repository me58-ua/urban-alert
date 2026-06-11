<#
.SYNOPSIS
  Construye y publica las imágenes de Urban Alert (backend y frontend) en Docker Hub.

.DESCRIPTION
  Alternativa MANUAL al workflow de GitHub Actions. Construye ambas imágenes
  multi-arquitectura (amd64 + arm64) con buildx y las sube con dos tags:
  el de componente movible (:backend / :frontend) y el versionado
  (:backend-<version> / :frontend-<version>).

  Requisitos previos (una sola vez):
    - docker login            (sesión en Docker Hub con permiso de escritura)
    - docker buildx           (incluido en Docker Desktop)

.PARAMETER Version
  Versión semántica a publicar, p. ej. 1.0.0

.PARAMETER Repo
  Repositorio destino. Por defecto naoufalcharafat/urban-alert

.EXAMPLE
  .\script\release.ps1 -Version 1.0.0
#>
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [string]$Repo = "naoufalcharafat/urban-alert"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # carpeta raíz del repo (urban-alert/)

Write-Host "==> Publicando $Repo  (versión $Version)" -ForegroundColor Cyan

Write-Host "==> Backend" -ForegroundColor Yellow
docker buildx build --platform linux/amd64,linux/arm64 `
    -t "${Repo}:backend" -t "${Repo}:backend-$Version" `
    --push "$root\backend"

Write-Host "==> Frontend" -ForegroundColor Yellow
docker buildx build --platform linux/amd64,linux/arm64 `
    -t "${Repo}:frontend" -t "${Repo}:frontend-$Version" `
    --push "$root\frontend"

Write-Host "==> Publicado correctamente: ${Repo} (backend/frontend $Version)" -ForegroundColor Green
