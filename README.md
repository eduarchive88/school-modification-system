<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 학교 생활기록부 수정 사항 공유 프로그램 (School Record Modification System)

담임 교사가 학생의 과목 수정 사항을 관리하고, 엑셀 시간표 데이터를 기반으로 담당 교사에게 자동으로 배정하는 시스템입니다.

## 주요 특징

✅ **정규화된 데이터베이스**: Supabase를 이용한 안정적인 데이터 저장
✅ **데이터 무결성**: Race condition 방지 및 안전한 트랜잭션 처리
✅ **실시간 동기화**: 5초 단위 자동 새로고침
✅ **다중 학기 지원**: 1학기, 2학기 데이터 분리 관리
✅ **권한 관리**: HOST(관리자) 및 GUEST(일반 교사) 역할 구분

## 기술 스택

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **파일 업로드**: xlsx (Excel 파일 처리)

## 시작하기

### 1단계: 필수 요구사항

- Node.js 18+ 설치
- GitHub 계정
- Supabase 계정 (https://supabase.com)
- Vercel 계정 (https://vercel.com)

### 2단계: 로컬 개발 환경 설정

```bash
git clone <your-repository-url>
cd schoolmodify
npm install
```

### 3단계: Supabase 설정

자세한 설정 방법은 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)를 참고하세요.

**빠른 설정:**
1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor에서 `supabase_migrations.sql` 파일의 내용 실행
3. Project Settings → API에서 URL과 anon key 복사

### 4단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

### 5단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 에 접속합니다.

### 6단계: 빌드

```bash
npm run build
```

## 배포 (Vercel)

### 자동 배포 (권장)

1. GitHub에 저장소 푸시:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. https://vercel.com 에 방문
3. "Add New..." → "Project"
4. GitHub 저장소 선택
5. **Environment Variables** 섹션에서:
   - `VITE_SUPABASE_URL` 추가
   - `VITE_SUPABASE_ANON_KEY` 추가
6. "Deploy" 클릭

### 수동 배포

```bash
npm install -g vercel
vercel
```

## 데이터베이스 구조

```
workspaces (작업공간)
├── students (학생)
│   └── electives (선택 과목)
├── timetable_entries (시간표)
└── corrections (수정 사항)
```

자세한 스키마는 [supabase_migrations.sql](./supabase_migrations.sql)을 참고합니다.

## 주요 기능

### 1. 학생 및 시간표 업로드
- Excel 파일에서 학생 명단 및 선택 과목 임포트
- 담당 교사 시간표 임포트

### 2. 수정 사항 관리
- 학생별 과목 수정 사항 추가/삭제
- 담당 교사에게 자동 배정
- 완료 여부 추적

### 3. 데이터 조회
- 학년별, 반별 필터링
- 학기별 데이터 분리 조회
- 완료 상태 표시

## 파일 구조

```
schoolmodify/
├── src/
│   ├── components/
│   │   ├── HomeView.tsx          # 초기 선택 화면
│   │   ├── HomeroomView.tsx      # 담임 뷰 (관리자)
│   │   └── TeacherView.tsx       # 교사 뷰
│   ├── services/
│   │   └── storageService.ts     # Supabase 연동
│   ├── utils/
│   │   ├── parser.ts             # Excel 파일 파싱
│   │   └── normalization.ts      # 데이터 정규화
│   ├── App.tsx
│   ├── types.ts                  # TypeScript 타입 정의
│   └── index.tsx
├── supabase_migrations.sql       # DB 초기화 스크립트
├── .env.example                  # 환경 변수 예제
├── SUPABASE_SETUP.md             # Supabase 상세 가이드
└── README.md                     # 이 파일
```

## 문제 해결

### "데이터가 저장되지 않음"
- 브라우저 개발자 도구(F12) Console에서 오류 확인
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- Supabase Project URL과 API Key 확인

### "Supabase 연결 오류"
- Supabase Project가 활성화되어 있는지 확인
- Network 탭에서 요청이 올바른 URL로 가는지 확인

### "권한 관리"
- 모든 사용자는 동일한 workspace code로 접근 가능
- HOST는 비밀번호 입력으로 관리 권한 획득
- GUEST는 읽기 권한만 가짐

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| VITE_SUPABASE_URL | Supabase Project URL | ✅ |
| VITE_SUPABASE_ANON_KEY | Supabase Anonymous Key | ✅ |

## 라이선스

MIT License

---

자세한 설정 가이드: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

