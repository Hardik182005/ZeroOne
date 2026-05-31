param([string]$Project = "mediflow-nexus-2026")

$envFile = Join-Path $PSScriptRoot "backend\.env"
$lines = Get-Content $envFile

$skipKeys = "APP_ENV,MAX_WIRE_TIMEOUT,CACHE_TTL_STOCK,CACHE_TTL_FUNDAMENTALS,ANAKIN_ID_NSE_INDIA,ANAKIN_ID_BSE_INDIA,ANAKIN_ID_SCREENER,ANAKIN_ID_ET,ANAKIN_ID_MC,ANAKIN_ID_FG,ANAKIN_ID_GT,ANAKIN_ID_ST".Split(",")

foreach ($line in $lines) {
    if ($line -notmatch "^[A-Z_]+=") { continue }
    $idx = $line.IndexOf("=")
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    if ($skipKeys -contains $key) { continue }
    if ($key -eq "REDIS_URL" -and $val -like "*localhost*") {
        $val = ""
        Write-Host "SKIP-REDIS: REDIS_URL is localhost, setting empty" -ForegroundColor Yellow
    }
    $tmpFile = [System.IO.Path]::GetTempFileName()
    # IMPORTANT: UTF8Encoding($false) = NO byte-order mark. The default
    # [System.Text.Encoding]::UTF8 prepends a BOM (﻿), which gets baked into the
    # secret value and breaks API auth headers (gRPC "Illegal header value",
    # ascii-codec errors). Always write secrets without a BOM.
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($tmpFile, $val, $utf8NoBom)
    $out = gcloud secrets create $key --data-file=$tmpFile --replication-policy=automatic --project=$Project 2>&1
    if ($LASTEXITCODE -ne 0) {
        gcloud secrets versions add $key --data-file=$tmpFile --project=$Project 2>&1 | Out-Null
        Write-Host "UPDATED: $key" -ForegroundColor Cyan
    } else {
        Write-Host "CREATED: $key" -ForegroundColor Green
    }
    Remove-Item $tmpFile -Force
}
Write-Host "Done. All secrets pushed." -ForegroundColor Green
