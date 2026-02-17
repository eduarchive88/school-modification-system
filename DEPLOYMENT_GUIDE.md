# GitHub & Vercel 배포 가이드

이 가이드는 프로젝트를 GitHub에 푸시하고 Vercel에 배포하는 단계를 설명합니다.

## 단계 1: GitHub 저장소 생성

### 로컬 저장소는 이미 생성되었습니다.

```bash
cd "c:\Users\eduar\OneDrive\Desktop\Vibecode\Vibecode\schoolmodify"
git log  # 커밋이 있는지 확인
```

### GitHub에서 새 저장소 생성

1. https://github.com/new 에 접속
2. Repository name: `school-modification-system`
3. Description: `학교 생활기록부 수정 사항 공유 프로그램`
4. Public 선택 (필요시 Private)
5. **"Create repository"** 클릭

### 로컬 저장소를 GitHub와 연결

프로젝트 디렉토리에서:

```bash
# 리모트 저장소 추가 (USERNAME과 REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/USERNAME/school-modification-system.git

# main 브랜치로 변경 (필요시)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 단계 2: Supabase 설정

[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)의 지침을 따릅니다.

**핵심:**
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 단계 3: Vercel 배포

### 방법 A: Vercel 웹 인터페이스 (권장)

1. https://vercel.com에 로그인
2. "Add New..." → "Project" 선택
3. GitHub 저장소 검색 및 선택
4. 프로젝트 설정:
   - **Framework Preset**: Auto (Vite로 자동 인식)
   - **Build Command**: `npm run build` (자동)
   - **Install Command**: `npm install` (자동)
5. **Environment Variables** 섹션:
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
6. "Deploy" 클릭

### 방법 B: Vercel CLI (선택사항)

```bash
# Vercel CLI 전역 설치
npm install -g vercel

# 프로젝트 디렉토리에서 배포
cd "c:\Users\eduar\OneDrive\Desktop\Vibecode\Vibecode\schoolmodify"
vercel

# 프롬프트에 따라 설정
# - "Set up and deploy"
# - "Y" (프로젝트가 현재 디렉토리에 있음)
# - "Y" (기본 설정 사용)
# - 환경 변수 입력
```

## 단계 4: 자동 배포 설정

Vercel에서 자동으로 다음을 수행합니다:

✅ **main 브랜치에 푸시**
↓
✅ **GitHub 웹훅 트리거**
↓
✅ **자동 빌드**
↓
✅ **자동 배포**

### 배포 URL
배포 완료 후 다음과 같은 URL을 받습니다:
```
https://school-modification-system.vercel.app
```

## 단계 5: 프로덕션 점검

1. https://school-modification-system.vercel.app 에 접속
2. 로그인하여 테스트:
   - 학생 데이터 업로드
   - 수정 사항 추가/삭제
   - 완료 상태 변경
3. 오류 확인:
   - Vercel Logs 탭에서 배포 로그 확인
   - 브라우저 개발자 도구(F12) Console에서 오류 확인

## 단계 6: 커스텀 도메인 설정 (선택사항)

1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Domains
3. "Add..." 클릭
4. 도메인 입력 및 DNS 설정
5. CNAME/A 레코드 추가 (도메인 제공자에서)

## 커밋 및 배포 반복

계속 개발하면서 배포하려면:

```bash
# 로컬에서 변경
git add .
git commit -m "Fix: 데이터 저장 오류"

# GitHub에 푸시
git push origin main

# Vercel이 자동으로 배포
```

## 배포 문제 해결

### "Build Failed" 오류
- Vercel Logs에서 오류 메시지 확인
- npm run build가 로컬에서 성공하는지 확인
- package.json의 빌드 명령어 확인

### "Cannot find module" 오류
- `npm install`이 모두 실행되었는지 확인
- package.json에 모든 의존성이 포함되어 있는지 확인

### "Environment Variables not set" 오류
- Vercel Settings → Environment Variables에서 확인
- 변수 이름이 정확한지 확인 (VITE_ 프리픽스 확인)

### Supabase 연결 실패
- Supabase Project URL이 정확한지 확인
- anon key가 올바른지 확인
- Supabase Settings → Authentication에서 Redirect URLs 추가

## 다음 단계

1. **모니터링**: Vercel Analytics 활성화
2. **백업**: Supabase 자동 백업 활성화
3. **커스텀 도메인**: 도메인 연결
4. **CI/CD**: 테스트 자동화 (GitHub Actions)

---

배포 완료! 🎉
