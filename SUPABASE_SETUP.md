# Supabase 설정 가이드

이 프로젝트는 Supabase를 데이터베이스로 사용합니다.

## 1단계: Supabase 프로젝트 생성

1. https://supabase.com 에 방문하여 로그인합니다
2. "New Project" 버튼을 클릭합니다
3. 프로젝트 이름: `school-modification-system`
4. 데이터베이스 비밀번호를 설정합니다 (안전한 비밀번호 사용)
5. 리전을 선택합니다 (한국: Seoul)
6. "Create new project" 클릭

## 2단계: 데이터베이스 테이블 생성

Supabase 대시보드에서 SQL Editor를 열고, `supabase_migrations.sql` 파일의 모든 내용을 복사하여 실행합니다.

또는 다음 단계를 따릅니다:

1. Supabase 대시보드 → SQL Editor 탭
2. "New query" 클릭
3. `supabase_migrations.sql` 파일의 전체 내용 복사 및 붙여넣기
4. "Run" 버튼 클릭

## 3단계: API 키 및 URL 가져오기

1. Supabase 대시보드 → Settings → API
2. 다음 정보를 복사합니다:
   - **Project URL**: `VITE_SUPABASE_URL`
   - **anon/public key**: `VITE_SUPABASE_ANON_KEY`

## 4단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음을 입력합니다:

```bash
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

## 5단계: 로컬 개발 서버 시작

```bash
npm install
npm run dev
```

## 6단계: Vercel 배포

1. GitHub에 저장소를 푸시합니다
2. https://vercel.com 에 로그인합니다
3. "Add New..." → "Project" 클릭
4. GitHub 저장소를 연결합니다
5. **Environment Variables** 섹션에서:
   - `VITE_SUPABASE_URL` 추가
   - `VITE_SUPABASE_ANON_KEY` 추가
6. "Deploy" 클릭

## 테이블 구조

### workspaces
- id (PRIMARY KEY)
- password
- created_at, updated_at

### students
- id (UUID)
- workspace_id (FK)
- student_id, name, grade, class, semester
- created_at, updated_at

### electives (선택 과목)
- id (UUID)
- student_id (FK)
- raw, group, subject_name, class_num
- created_at

### timetable_entries (시간표)
- id (UUID)
- workspace_id (FK)
- teacher_name, grade, class, subject_name, is_common, is_manual, semester
- created_at, updated_at

### corrections (수정 사항)
- id (UUID)
- workspace_id (FK), student_id (FK)
- student_name, grade_class, subject_key, subject_name
- before, after, teachers (배열)
- is_completed, completed_at, semester
- created_at, updated_at

## 문제 해결

### "연결할 수 없습니다" 오류
- Supabase Project URL 확인
- Supabase anon key 확인
- 네트워크 연결 확인

### 데이터가 저장되지 않음
- 브라우저 개발자 도구(F12) → Console에서 오류 메시지 확인
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- Vercel 배포의 Environment Variables 확인

### CORS 오류
- Supabase Settings → Authentication → URL Configuration 에서 Redirect URLs 추가
