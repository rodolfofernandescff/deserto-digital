# Desenvolvimento local — backend (8000) + frontend (3000)
# Uso: .\scripts\dev.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Instalando dependencias do backend..." -ForegroundColor Cyan
Push-Location "$Root\backend"
pip install -e ".[dev]" -q

if (-not (Test-Path "$Root\data\municipios.json")) {
    Write-Host "==> Gerando dataset (ETL ANATEL + IBGE)..." -ForegroundColor Cyan
    python -m src.etl.pipeline
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
} else {
    Write-Host "==> Dataset encontrado em data/municipios.json" -ForegroundColor Green
}

Write-Host "==> Subindo backend em http://127.0.0.1:8000" -ForegroundColor Cyan
$backend = Start-Process -PassThru -WindowStyle Normal powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Root\backend'; uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload"
)

Start-Sleep -Seconds 3

Write-Host "==> Subindo frontend em http://localhost:3000" -ForegroundColor Cyan
Push-Location "$Root\frontend"
if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev

Pop-Location
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
