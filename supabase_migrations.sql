-- ==========================================
-- 학교생활기록부 수정 사항 공유 프로그램 - Supabase 마이그레이션
-- ==========================================

-- 1. workspaces 테이블 (작업공간)
CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(20) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. students 테이블 (학생)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(20) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  class INTEGER NOT NULL,
  semester INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, student_id, semester)
);

-- 3. electives 테이블 (선택 과목)
CREATE TABLE IF NOT EXISTS electives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  raw VARCHAR(255) NOT NULL,
  group VARCHAR(100),
  subject_name VARCHAR(100) NOT NULL,
  class_num VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. timetable_entries 테이블 (시간표)
CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(20) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  teacher_name VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  class INTEGER NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  is_common BOOLEAN NOT NULL DEFAULT FALSE,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  semester INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. corrections 테이블 (수정 사항)
CREATE TABLE IF NOT EXISTS corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(20) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(100) NOT NULL,
  grade_class VARCHAR(50) NOT NULL,
  subject_key VARCHAR(255) NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  before TEXT NOT NULL,
  after TEXT NOT NULL,
  teachers TEXT[] NOT NULL DEFAULT '{}',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  semester INTEGER NOT NULL DEFAULT 1
);

-- ==========================================
-- 인덱스 (성능 최적화)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_students_workspace ON students(workspace_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_class ON students(grade, class);
CREATE INDEX IF NOT EXISTS idx_timetable_workspace ON timetable_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_timetable_grade_class ON timetable_entries(grade, class);
CREATE INDEX IF NOT EXISTS idx_corrections_workspace ON corrections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_corrections_student ON corrections(student_id);
CREATE INDEX IF NOT EXISTS idx_corrections_completed ON corrections(is_completed);
CREATE INDEX IF NOT EXISTS idx_corrections_created ON corrections(created_at);
CREATE INDEX IF NOT EXISTS idx_electives_student ON electives(student_id);

-- ==========================================
-- RLS (Row Level Security) 정책 - 모든 테이블에 대해 비활성화 (선택사항)
-- ==========================================
-- 필요에 따라 RLS를 활성화할 수 있습니다.
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- etc.

COMMIT;
