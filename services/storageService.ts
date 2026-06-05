
import { createClient } from '@supabase/supabase-js';
import { WorkspaceData, Student, Elective, TimetableEntry, Correction } from '../types';

const getSafeEnv = (key: string): string => {
  try {
    return (import.meta as any).env?.[key] || '';
  } catch (e) {
    return '';
  }
};

const SUPABASE_URL = getSafeEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getSafeEnv('VITE_SUPABASE_ANON_KEY');

const isValidUrl = SUPABASE_URL && SUPABASE_URL.startsWith('https://');
export const supabase = (isValidUrl && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'school_records' } })
  : null;

const STORAGE_KEY_PREFIX = 'teacher_hub_ws_';
export const isCloudConnected = () => !!supabase;

// ---- 로컬스토리지 폴백 ----

const getFromLocal = (code: string): WorkspaceData => {
  const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
  return raw ? JSON.parse(raw) : { students: [], timetable: [], corrections: [] };
};

const saveToLocal = (code: string, partial: Partial<WorkspaceData>) => {
  const existing = getFromLocal(code);
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify({ ...existing, ...partial }));
};

// ---- DB row → 앱 타입 변환 ----

const toStudent = (row: any): Student => ({
  id: row.student_id,
  name: row.name,
  grade: row.grade,
  class: row.class,
  electives: (row.electives || []).map((e: any): Elective => ({
    raw: e.raw,
    group: e.subject_group,
    subjectName: e.subject_name,
    classNum: e.class_num,
  })),
});

const toTimetable = (row: any): TimetableEntry => ({
  teacherName: row.teacher_name,
  grade: row.grade,
  subjectName: row.subject_name,
  classNum: String(row.class),
  isCommon: row.is_common,
});

const toCorrection = (row: any): Correction => ({
  id: row.id,
  workspaceCode: row.workspace_id,
  studentId: row.student_id,
  studentName: row.student_name,
  gradeClass: row.grade_class,
  subjectKey: row.subject_key,
  subjectName: row.subject_name,
  before: row.before,
  after: row.after,
  teachers: row.teachers || [],
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  isCompleted: row.is_completed ?? false,
  completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
  semester: row.semester,
});

// ---- 네트워크 에러 판별 ----

const isNetworkErr = (err: any) =>
  err?.message?.includes('Failed to fetch') ||
  err?.message?.includes('NetworkError') ||
  err?.code === 'PGRST000' ||
  !navigator.onLine;

// ---- 워크스페이스 조회 ----

export const getWorkspace = async (code: string): Promise<WorkspaceData> => {
  if (!supabase) return getFromLocal(code);

  try {
    const [wsRes, studentsRes, timetableRes, correctionsRes] = await Promise.all([
      supabase.from('workspaces').select('password').eq('id', code).maybeSingle(),
      supabase.from('students').select('*, electives(*)').eq('workspace_id', code),
      supabase.from('timetable_entries').select('*').eq('workspace_id', code),
      supabase.from('corrections').select('*').eq('workspace_id', code).order('created_at', { ascending: true }),
    ]);

    for (const res of [wsRes, studentsRes, timetableRes, correctionsRes]) {
      if (res.error) throw res.error;
    }

    const studentsRaw = studentsRes.data || [];
    const timetableRaw = timetableRes.data || [];
    const correctionsRaw = correctionsRes.data || [];

    const students1 = studentsRaw.filter(s => s.semester === 1).map(toStudent);
    const students2 = studentsRaw.filter(s => s.semester === 2).map(toStudent);
    const timetable1 = timetableRaw.filter(t => t.semester === 1 && !t.is_manual).map(toTimetable);
    const timetable2 = timetableRaw.filter(t => t.semester === 2 && !t.is_manual).map(toTimetable);
    const manualTimetable = timetableRaw.filter(t => t.is_manual).map(toTimetable);
    const corrections = correctionsRaw.map(toCorrection);

    const result: WorkspaceData = {
      password: wsRes.data?.password,
      students1,
      timetable1,
      students2,
      timetable2,
      manualTimetable,
      students: students1,
      timetable: timetable1,
      corrections,
    };

    // 로컬에 캐시 저장 (오프라인 대비)
    saveToLocal(code, result);
    return result;
  } catch (err: any) {
    if (isNetworkErr(err)) {
      const cached = getFromLocal(code);
      if (cached.corrections?.length || cached.students1?.length || cached.students?.length) {
        console.warn('Supabase 연결 실패 - 로컬 캐시로 폴백합니다.');
        return cached;
      }
      throw new Error('SERVER_DOWN');
    }
    throw err;
  }
};

// ---- 워크스페이스 저장 ----

export const saveWorkspace = async (code: string, partialData: Partial<WorkspaceData>) => {
  if (!partialData || Object.keys(partialData).length === 0) return;
  if (!supabase) { saveToLocal(code, partialData); return; }

  try {
    const {
      password,
      students1, students2,
      timetable1, timetable2, manualTimetable,
      corrections,
    } = partialData;

    // 비밀번호 저장
    if (password !== undefined) {
      const { error } = await supabase
        .from('workspaces')
        .upsert({ id: code, password }, { onConflict: 'id' });
      if (error) throw error;
    }

    // 학생 목록 저장 (학기별 전체 교체)
    const saveStudents = async (list: Student[], semester: number) => {
      const db = supabase!;
      // 기존 학생의 UUID 조회 (electives 삭제에 필요)
      const { data: existing } = await db
        .from('students').select('id').eq('workspace_id', code).eq('semester', semester);
      if (existing?.length) {
        await db.from('electives').delete().in('student_id', existing.map(s => s.id));
        await db.from('students').delete().eq('workspace_id', code).eq('semester', semester);
      }
      if (list.length === 0) return;

      const { data: inserted, error: sErr } = await db
        .from('students')
        .insert(list.map(s => ({
          workspace_id: code,
          student_id: s.id,
          name: s.name,
          grade: s.grade,
          class: s.class,
          semester,
        })))
        .select('id, student_id');
      if (sErr) throw sErr;

      const electiveRows = (inserted || []).flatMap((dbRow: any) => {
        const appStudent = list.find(s => s.id === dbRow.student_id);
        return (appStudent?.electives || []).map(e => ({
          student_id: dbRow.id,
          raw: e.raw,
          subject_group: e.group,
          subject_name: e.subjectName,
          class_num: e.classNum,
        }));
      });
      if (electiveRows.length > 0) {
        const { error: eErr } = await db.from('electives').insert(electiveRows);
        if (eErr) throw eErr;
      }
    };

    if (students1 !== undefined) await saveStudents(students1, 1);
    if (students2 !== undefined) await saveStudents(students2, 2);

    // 시간표 저장 (학기별 전체 교체)
    const saveTimetable = async (list: TimetableEntry[], semester: number, isManual: boolean) => {
      const db = supabase!;
      const { error: dErr } = await db
        .from('timetable_entries')
        .delete()
        .eq('workspace_id', code)
        .eq('semester', semester)
        .eq('is_manual', isManual);
      if (dErr) throw dErr;
      if (list.length === 0) return;

      const { error: iErr } = await db.from('timetable_entries').insert(
        list.map(t => ({
          workspace_id: code,
          teacher_name: t.teacherName,
          grade: t.grade,
          class: t.classNum,
          subject_name: t.subjectName,
          is_common: t.isCommon,
          is_manual: isManual,
          semester,
        }))
      );
      if (iErr) throw iErr;
    };

    if (timetable1 !== undefined) await saveTimetable(timetable1, 1, false);
    if (timetable2 !== undefined) await saveTimetable(timetable2, 2, false);
    if (manualTimetable !== undefined) await saveTimetable(manualTimetable, 1, true);

    // 정정내역 전체 교체 (백업 복원 등에 사용)
    if (corrections !== undefined) {
      const db = supabase!;
      await db.from('corrections').delete().eq('workspace_id', code);
      if (corrections.length > 0) {
        const { error } = await db.from('corrections').insert(
          corrections.map(c => ({
            id: c.id,
            workspace_id: code,
            student_id: c.studentId,
            student_name: c.studentName,
            grade_class: c.gradeClass,
            subject_key: c.subjectKey,
            subject_name: c.subjectName,
            before: c.before,
            after: c.after,
            teachers: c.teachers,
            is_completed: c.isCompleted ?? false,
            completed_at: c.completedAt ? new Date(c.completedAt).toISOString() : null,
            semester: c.semester,
            created_at: new Date(c.createdAt).toISOString(),
          }))
        );
        if (error) throw error;
      }
    }
  } catch (err) {
    console.error('Critical Save Error:', err);
    alert('서버 저장 중 오류가 발생했습니다. 화면을 새로고침해주세요.');
  }
};

// ---- 정정내역 개별 조작 (read-modify-write 없이 직접 처리) ----

export const addCorrection = async (code: string, correction: Correction) => {
  if (!supabase) {
    const ws = getFromLocal(code);
    saveToLocal(code, { corrections: [...(ws.corrections || []), correction] });
    return;
  }
  const { error } = await supabase.from('corrections').insert({
    id: correction.id,
    workspace_id: code,
    student_id: correction.studentId,
    student_name: correction.studentName,
    grade_class: correction.gradeClass,
    subject_key: correction.subjectKey,
    subject_name: correction.subjectName,
    before: correction.before,
    after: correction.after,
    teachers: correction.teachers,
    is_completed: correction.isCompleted ?? false,
    completed_at: correction.completedAt ? new Date(correction.completedAt).toISOString() : null,
    semester: correction.semester,
    created_at: new Date(correction.createdAt).toISOString(),
  });
  if (error) throw error;
};

export const deleteCorrection = async (_code: string, correctionId: string) => {
  if (!supabase) {
    const ws = getFromLocal(_code);
    saveToLocal(_code, { corrections: (ws.corrections || []).filter(c => c.id !== correctionId) });
    return;
  }
  const { error } = await supabase.from('corrections').delete().eq('id', correctionId);
  if (error) throw error;
};

export const updateCorrectionStatus = async (_code: string, correctionId: string, isCompleted: boolean) => {
  if (!supabase) {
    const ws = getFromLocal(_code);
    saveToLocal(_code, {
      corrections: (ws.corrections || []).map(c =>
        c.id === correctionId
          ? { ...c, isCompleted, completedAt: isCompleted ? Date.now() : undefined }
          : c
      ),
    });
    return;
  }
  const { error } = await supabase.from('corrections').update({
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
  }).eq('id', correctionId);
  if (error) throw error;
};

// ---- 워크스페이스 전체 삭제 ----

export const clearWorkspace = async (code: string) => {
  if (!supabase) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${code}`);
    return;
  }
  // electives는 students FK ON DELETE CASCADE로 자동 삭제됨
  await Promise.all([
    supabase.from('corrections').delete().eq('workspace_id', code),
    supabase.from('timetable_entries').delete().eq('workspace_id', code),
    supabase.from('students').delete().eq('workspace_id', code),
  ]);
  await supabase.from('workspaces').delete().eq('id', code);
};
