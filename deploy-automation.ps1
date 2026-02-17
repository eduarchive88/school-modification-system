#!/usr/bin/env pwsh

# ==========================================
# 학교생활기록부 자동화 배포 스크립트
# GitHub, Supabase, Vercel 완전 자동화
# ==========================================

param(
    [string]$GitHubToken,
    [string]$GitHubUsername,
    [string]$VercelToken,
    [string]$SupabaseServiceKey,
    [string]$SupabaseEmail
)

$ErrorActionPreference = "Stop"

# ==========================================
# 색상 함수
# ==========================================
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️ $Message" -ForegroundColor Cyan
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message, [int]$Number)
    Write-Host "`n✨ [단계 $Number] $Message" -ForegroundColor Yellow
}

# ==========================================
# Step 1: CLI 도구 설치
# ==========================================
Write-Step "필수 CLI 도구 설치" 1

Write-Info "GitHub CLI 확인 중..."
try {
    $ghVersion = gh --version 2>$null
    Write-Success "GitHub CLI 이미 설치됨: $ghVersion"
} catch {
    Write-Info "GitHub CLI 설치 중..."
    winget install GitHub.cli -e --accept-package-agreements --accept-source-agreements
    if ($? -eq $false) {
        Write-Error-Custom "GitHub CLI 설치 실패"
    }
}

Write-Info "Vercel CLI 확인 중..."
try {
    $vercelVersion = vercel --version 2>$null
    Write-Success "Vercel CLI 이미 설치됨: $vercelVersion"
} catch {
    Write-Info "Vercel CLI 설치 중..."
    npm install -g vercel
    if ($? -eq $false) {
        Write-Error-Custom "Vercel CLI 설치 실패"
    }
}

Write-Info "Supabase CLI 확인 중..."
try {
    $supabaseVersion = supabase --version 2>$null
    Write-Success "Supabase CLI 이미 설치됨: $supabaseVersion"
} catch {
    Write-Info "Supabase CLI 설치 중..."
    npm install -g supabase
    if ($? -eq $false) {
        Write-Error-Custom "Supabase CLI 설치 실패"
    }
}

Write-Success "모든 CLI 도구 설치/확인 완료"

# ==========================================
# Step 2: GitHub 저장소 생성 및 푸시
# ==========================================
Write-Step "GitHub 저장소 생성 및 코드 푸시" 2

Write-Info "GitHub 로그인 (CLI)..."
echo $GitHubToken | gh auth login --with-token

Write-Info "GitHub에서 기존 저장소 확인..."
$repoExists = gh repo view eduarchive88/school-modification-system 2>$null
if ($repoExists) {
    Write-Success "저장소가 이미 존재합니다. 기존 저장소로 진행합니다."
} else {
    Write-Info "새 GitHub 저장소 생성 중..."
    gh repo create school-modification-system `
        --public `
        --source=. `
        --remote=origin `
        --push
    
    if ($? -eq $false) {
        Write-Error-Custom "GitHub 저장소 생성 실패"
        exit 1
    }
}

Write-Success "GitHub 저장소 준비 완료: https://github.com/$GitHubUsername/school-modification-system"

# ==========================================
# Step 3: 환경 변수 설정 파일 생성
# ==========================================
Write-Step "Supabase 프로젝트 정보 수집" 3

Write-Info "Supabase API URL과 anon key를 얻기 위해 대시보드 접속 필요..."
Write-Info "https://app.supabase.com 에서 다음을 진행하세요:"
Write-Info "1. 프로젝트에 들어갑니다"
Write-Info "2. Settings → API 에서 URL과 anon key를 복사합니다"

# 사용자 입력 받기
$supabaseUrl = Read-Host "Supabase Project URL 입력 (https://... 형태)"
$supabaseAnonKey = Read-Host "Supabase anon/public key 입력"

# .env.local 생성
Write-Info ".env.local 파일 생성 중..."
$envContent = @"
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseAnonKey
"@

Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8
Write-Success ".env.local 파일 생성 완료"

# ==========================================
# Step 4: Supabase 데이터베이스 테이블 생성
# ==========================================
Write-Step "Supabase 데이터베이스 마이그레이션" 4

Write-Info "Supabase 마이그레이션 실행 중..."
Write-Info "https://app.supabase.com/project/[project-id]/sql/new 에서 다음 SQL을 실행해주세요:"
Write-Info ""
Write-Info "supabase_migrations.sql 파일의 전체 내용을 복사하여 SQL Editor에 붙여넣으세요"
Write-Info ""
Write-Info "명령어: Get-Content supabase_migrations.sql | Set-Clipboard"

Get-Content .\supabase_migrations.sql | Set-Clipboard
Write-Success "SQL 쿼리를 클립보드에 복사했습니다."

Write-Host "`n수동 작업 필요:" -ForegroundColor Yellow
Write-Host "1. 브라우저에서 https://app.supabase.com/project/[project-id]/sql/new 열기"
Write-Host "2. SQL Editor에 쿼리 붙여넣기 (Ctrl+V)"
Write-Host "3. 'Run' 버튼 클릭"
Write-Host "4. 모든 테이블 생성 확인"

$readyForVercel = Read-Host "`nSupabase 마이그레이션 완료했나요? (yes/no)"
if ($readyForVercel -ne "yes") {
    Write-Error-Custom "Supabase 마이그레이션을 먼저 완료하세요"
    exit 1
}

Write-Success "Supabase 데이터베이스 준비 완료"

# ==========================================
# Step 5: Vercel 배포
# ==========================================
Write-Step "Vercel 배포 설정" 5

Write-Info "Vercel CLI 토큰 설정 중..."
$env:VERCEL_TOKEN = $VercelToken

Write-Info "Vercel에 배포 중..."
vercel --prod --yes

if ($? -eq $false) {
    Write-Error-Custom "Vercel 배포 실패"
    exit 1
}

Write-Success "Vercel 배포 완료"

# ==========================================
# Step 6: 대시보드 URL 설정
# ==========================================
Write-Step "배포 후 설정" 6

Write-Info "Vercel 대시보드에서 Environment Variables에 다음을 추가하세요:"
Write-Host "VITE_SUPABASE_URL=$supabaseUrl" -ForegroundColor Cyan
Write-Host "VITE_SUPABASE_ANON_KEY=$supabaseAnonKey" -ForegroundColor Cyan

Write-Host "`n배포 후 설정 단계:" -ForegroundColor Yellow
Write-Host "1. Vercel 대시보드 (https://vercel.com) 접속"
Write-Host "2. 프로젝트 선택: school-modification-system"
Write-Host "3. Settings → Environment Variables"
Write-Host "4. 위의 2개 변수 추가"
Write-Host "5. Redeploy 버튼 클릭"

# ==========================================
# Step 7: 최종 요약
# ==========================================
Write-Step "자동화 완료! 최종 요약" 7

Write-Host "`n" -NoNewline
Write-Success "GitHub 저장소: https://github.com/$GitHubUsername/school-modification-system"
Write-Success "Supabase 프로젝트: https://app.supabase.com"
Write-Success "Vercel 배포: vercel.com 대시보드에서 확인"

Write-Host "`n📋 완료 체크리스트:" -ForegroundColor Yellow
Write-Host "✅ GitHub 저장소 생성 및 푸시"
Write-Host "⏳ Supabase 마이그레이션 (수동 - SQL 실행)"
Write-Host "✅ Vercel 배포"
Write-Host "⏳ Environment Variables 설정 (Vercel)"

Write-Host "`n🚀 프로덕션 URL 확인하세요:" -ForegroundColor Green
Write-Host "(Vercel 대시보드 → 프로젝트 → Deployments 탭에서 확인 가능)"

Write-Host "`n💡 다음 단계:" -ForegroundColor Cyan
Write-Host "1. Supabase SQL 마이그레이션을 수동으로 실행"
Write-Host "2. Vercel Environment Variables 설정"
Write-Host "3. Vercel Redeploy 실행"
Write-Host "4. 프로덕션 URL 테스트"

Write-Success "모든 자동화가 완료되었습니다! 🎉"
