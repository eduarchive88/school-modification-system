# 🚀 전체 설정 체크리스트

프로젝트를 완벽하게 설정하고 배포하기 위한 단계별 체크리스트입니다.

## 📋 사전 준비

- [ ] GitHub 계정 보유
- [ ] Supabase 계정 (https://supabase.com)
- [ ] Vercel 계정 (https://vercel.com)
- [ ] Node.js 18+ 설치 확인: `node -v`

## 🔧 로컬 개발 환경

- [x] 프로젝트 디렉토리: `c:\Users\eduar\OneDrive\Desktop\Vibecode\Vibecode\schoolmodify`
- [x] Git 저장소 초기화 완료
- [x] 초기 커밋 생성 완료
- [ ] `npm install` 실행: 의존성 설치
- [ ] `npm run dev` 테스트: 로컬 개발 서버 작동 확인

## 🐘 Supabase 설정

### 1단계: Supabase 프로젝트 생성
- [ ] https://supabase.com 방문
- [ ] "New Project" 클릭
- [ ] 프로젝트 이름: `school-modification-system`
- [ ] 데이터베이스 비밀번호 설정
- [ ] 리전 선택 (Seoul 권장)
- [ ] 프로젝트 생성 완료 (5-10분 소요)

### 2단계: 데이터베이스 테이블 생성
- [ ] Supabase 대시보드 → SQL Editor
- [ ] `supabase_migrations.sql` 파일 전체 복사
- [ ] SQL Editor에 붙여넣기
- [ ] "Run" 버튼 클릭
- [ ] 모든 테이블 생성 확인 (workspaces, students, corrections 등)

### 3단계: API 키 확인
- [ ] Supabase Settings → API 탭 방문
- [ ] Project URL 복사 (예: https://xxxxx.supabase.co)
- [ ] anon/public key 복사 (긴 문자열)
- [ ] 이 정보를 안전한 곳에 저장

### 4단계: 로컬 환경 변수 설정
- [ ] 프로젝트 루트에 `.env.local` 파일 생성
- [ ] 다음 내용 입력:
  ```
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```
- [ ] 파일 저장

### 5단계: 로컬 테스트
- [ ] 터미널에서 `npm run dev` 실행
- [ ] 브라우저에서 http://localhost:5173 접속
- [ ] 기본 화면 표시 확인
- [ ] 콘솔에 Supabase 연결 오류가 없는지 확인

## 📦 GitHub 저장소 생성

### 1단계: GitHub에서 저장소 생성
- [ ] https://github.com/new 방문
- [ ] Repository name: `school-modification-system`
- [ ] Description 입력: `학교 생활기록부 수정 사항 공유 프로그램`
- [ ] Public 선택
- [ ] "Create repository" 클릭

### 2단계: GitHub 계정 인증 (처음이면)
```bash
# 다음 중 하나 선택:
# 방법 A: SSH 키 설정 (권장)
ssh -T git@github.com
# 또는
# 방법 B: HTTPS + Personal Token (더 간단)
```

### 3단계: 로컬 저장소 연결
```bash
cd "c:\Users\eduar\OneDrive\Desktop\Vibecode\Vibecode\schoolmodify"
# 리모트 저장소 추가 (USERNAME 변경!)
git remote add origin https://github.com/USERNAME/school-modification-system.git
# 또는 SSH:
# git remote add origin git@github.com:USERNAME/school-modification-system.git

# 확인
git remote -v
```

### 4단계: GitHub에 푸시
```bash
git branch -M main
git push -u origin main
```

- [ ] GitHub에서 푸시 확인
- [ ] 모든 파일이 나타났는지 확인
- [ ] 커밋 히스토리 확인

## 🚀 Vercel 배포

### 1단계: Vercel 프로젝트 생성
- [ ] https://vercel.com 로그인
- [ ] "Add New..." → "Project" 클릭
- [ ] GitHub 저장소 검색
- [ ] `school-modification-system` 선택
- [ ] "Import" 클릭

### 2단계: 프로젝트 설정
- [ ] Framework: **Auto (Vite)** 선택
- [ ] Build Command: `npm run build` (자동)
- [ ] Install Command: `npm install` (자동)

### 3단계: 환경 변수 추가
**Environment Variables** 섹션:
- [ ] 키: `VITE_SUPABASE_URL`
  값: `https://xxxxx.supabase.co`
- [ ] 키: `VITE_SUPABASE_ANON_KEY`
  값: `your-anon-key-here`

### 4단계: 배포
- [ ] "Deploy" 버튼 클릭
- [ ] 배포 진행 상황 확인 (3-5분)
- [ ] 배포 완료 후 URL 확인 (예: https://school-modification-system.vercel.app)

### 5단계: 배포 테스트
- [ ] Vercel 제공 URL 접속
- [ ] 기본 화면 표시 확인
- [ ] 로그인 기능 테스트
- [ ] 데이터 저장 테스트

## 🔐 프로덕션 보안 확인

- [ ] `.env.local` 파일이 `.gitignore`에 포함되었는지 확인
- [ ] GitHub에 환경 변수가 푸시되지 않았는지 확인
- [ ] Supabase API 키가 노출되지 않았는지 확인
- [ ] Vercel Environment Variables가 설정되었는지 확인

## 📊 성능 및 모니터링

- [ ] Vercel Deployments 탭에서 배포 히스토리 확인
- [ ] Vercel Functions 탭에서 API 호출 확인
- [ ] Supabase Dashboard에서 데이터베이스 상태 확인
- [ ] 브라우저 개발자 도구에서 콘솔 오류 확인

## 🐛 문제 발생 시

### 배포 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# 빌드 결과 확인
ls dist/
```

### Supabase 연결 안 됨
- [ ] API URL과 Key가 정확한지 확인
- [ ] `.env.local` 파일 저장 확인
- [ ] 로컬 서버 재시작 (`npm run dev`)
- [ ] Supabase 프로젝트가 활성화되어 있는지 확인

### 데이터가 저장되지 않음
- [ ] Supabase SQL Editor에서 테이블 생성 확인
- [ ] 브라우저 Console에서 오류 메시지 확인
- [ ] Supabase Logs에서 SQL 오류 확인

## 🎉 배포 완료!

다음은:
1. **모니터링**: Vercel Analytics 활성화
2. **백업**: Supabase 자동 백업 설정
3. **커스텀 도메인**: 도메인 연결
4. **CI/CD**: GitHub Actions로 테스트 자동화

---

## 📞 지원

- Supabase 문서: https://supabase.com/docs
- Vercel 문서: https://vercel.com/docs
- React 문서: https://react.dev
