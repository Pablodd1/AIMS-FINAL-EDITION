# Pre-deployment Verification Script (PowerShell)

Write-Host "🔍 Starting Pre-deployment Audit..." -ForegroundColor Cyan

# 1. Environment Check
Write-Host "`n1. Checking Environment Files..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ .env file missing" -ForegroundColor Red
}

if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore"
    if ($gitignore -match ".env") {
        Write-Host "✅ .env is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SECURITY WARNING: .env is NOT in .gitignore!" -ForegroundColor Yellow
    }
}

# 2. Build Check
Write-Host "`n2. Running Build Test..." -ForegroundColor Yellow
try {
    npx vite build -c vite.config.ts
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
}

# 3. Dependencies Check
Write-Host "`n3. Checking Dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    Write-Host "✅ Found package.json (Version: $($packageJson.version))" -ForegroundColor Green
}

# 4. Vercel Config Check
Write-Host "`n4. Checking Vercel Configuration..." -ForegroundColor Yellow
if (Test-Path "vercel.json") {
    Write-Host "✅ vercel.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ vercel.json missing" -ForegroundColor Red
}

Write-Host "`n🏁 Audit Complete. Please check the logs above." -ForegroundColor Cyan
