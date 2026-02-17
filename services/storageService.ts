
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WorkspaceData, Correction, Student, TimetableEntry } from '../types';

const getSafeEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key] || '';
    }
  } catch (e) {
    console.error(`Error reading env key ${key}:`, e);
  }
  return '';
};

const SUPABASE_URL = getSafeEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getSafeEnv('VITE_SUPABASE_ANON_KEY');

const isValidUrl = SUPABASE_URL && SUPABASE_URL.startsWith('https://');
export const supabase = (isValidUrl && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const STORAGE_KEY_PREFIX = 'teacher_hub_ws_';

export const isCloudConnected = () => !!supabase;

// ==========================================
// 헬퍼 함수: 정규화된 ID로부터 grade/class 추출
// ==========================================
const parseStudentId = (id: string): { grade: number; classNum: number } => {
  const match = id.match(/(\d{1,2})(\d{2})/);
  if (match) {
    return { grade: parseInt(match[1]), classNum: parseInt(match[2]) };
  }
  return { grade: 1, classNum: 1 };
};

/**
 * 워크스페이스 데이터를 가져옵니다 (정규화된 테이블 구조 사용)
 */
export const getWorkspace = async (code: string): Promise<WorkspaceData> => {
  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    return raw ? JSON.parse(raw) : { students: [], timetable: [], corrections: [] };
  }

  try {
    // 1. 학생 데이터 가져오기 (선택 과목 포함)
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        name,
        grade,
        class,
        semester,
        electives (*)
      `)
      .eq('workspace_id', code)
      .order('semester', { ascending: true });

    if (studentsError) throw studentsError;

    // 2. 시간표 데이터 가져오기 (semester별로)
    const { data: timetableData, error: timetableError } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('workspace_id', code)
      .order('semester', { ascending: true });

    if (timetableError) throw timetableError;

    // 3. 수정 사항 가져오기
    const { data: correctionsData, error: correctionsError } = await supabase
      .from('corrections')
      .select('*')
      .eq('workspace_id', code);

    if (correctionsError) throw correctionsError;

    // 4. 워크스페이스 정보 (비밀번호 등)
    const { data: workspaceInfo, error: wsError } = await supabase
      .from('workspaces')
      .select('password')
      .eq('id', code)
      .maybeSingle();

    if (wsError) throw wsError;

    // 5. 데이터 변환 (semester별로 분리)
    const transformStudent = (s: any) => ({
      id: s.student_id,
      name: s.name,
      grade: s.grade,
      class: s.class,
      electives: (s.electives || []).map((e: any) => ({
        raw: e.raw,
        group: e.subject_group,
        subjectName: e.subject_name,
        classNum: e.class_num
      }))
    });

    const students1 = (studentsData || [])
      .filter((s: any) => s.semester === 1)
      .map(transformStudent);
    
    const students2 = (studentsData || [])
      .filter((s: any) => s.semester === 2)
      .map(transformStudent);

    const transformTimetable = (t: any) => ({
      teacherName: t.teacher_name,
      grade: t.grade,
      subjectName: t.subject_name,
      classNum: t.class,
      isCommon: t.is_common
    });

    const timetable1 = (timetableData || [])
      .filter((t: any) => t.semester === 1 && !t.is_manual)
      .map(transformTimetable);
    
    const timetable2 = (timetableData || [])
      .filter((t: any) => t.semester === 2 && !t.is_manual)
      .map(transformTimetable);

    const manualTimetable = (timetableData || [])
      .filter((t: any) => t.is_manual)
      .map(transformTimetable);

    const corrections: Correction[] = (correctionsData || []).map(c => ({
      id: c.id,
      workspaceCode: c.workspace_id,
      studentId: c.student_id || '',
      studentName: c.student_name,
      gradeClass: c.grade_class,
      subjectKey: c.subject_key,
      subjectName: c.subject_name,
      before: c.before,
      after: c.after,
      teachers: c.teachers || [],
      createdAt: new Date(c.created_at).getTime(),
      isCompleted: c.is_completed,
      completedAt: c.completed_at ? new Date(c.completed_at).getTime() : undefined,
      semester: c.semester
    }));

    return {
      password: workspaceInfo?.password,
      students: students1.length > 0 ? students1 : students2,
      students1,
      students2,
      timetable: timetable1.length > 0 ? timetable1 : timetable2,
      timetable1,
      timetable2,
      manualTimetable,
      corrections
    } as WorkspaceData;
  } catch (err) {
    console.error("Critical Fetch Error:", err);
    return { students: [], timetable: [], corrections: [] };
  }
};

/**
 * 워크스페이스 데이터를 정규화된 테이블에 저장합니다 (Race Condition 안전)
 */
export const saveWorkspace = async (code: string, partialData: Partial<WorkspaceData>) => {
  if (!partialData || Object.keys(partialData).length === 0) return;

  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    const existing = raw ? JSON.parse(raw) : { students: [], timetable: [], corrections: [] };
    const updated = { ...existing, ...partialData };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify(updated));
    return;
  }

  try {
    // 1. 워크스페이스 비밀번호 저장
    if (partialData.password) {
      const { error: wsError } = await supabase
        .from('workspaces')
        .upsert({ id: code, password: partialData.password }, { onConflict: 'id' });
      if (wsError) throw wsError;
    }

    // 2. 학생 데이터 저장 (students, students1, students2 모두 처리)
    const studentsToSave = partialData.students || partialData.students1 || partialData.students2;
    const semester = partialData.students1 ? 1 : (partialData.students2 ? 2 : 1);
    
    if (studentsToSave && studentsToSave.length > 0) {
      // 먼저 기존 학생 삭제 후 새로 저장
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('workspace_id', code)
        .eq('semester', semester);
      
      if (deleteError) throw deleteError;

      const studentRecords = studentsToSave.map(s => ({
        workspace_id: code,
        student_id: s.id,
        name: s.name,
        grade: s.grade,
        class: s.class,
        semester: semester
      }));

      const { data: insertedStudents, error: studentError } = await supabase
        .from('students')
        .insert(studentRecords)
        .select('id, student_id');

      if (studentError) throw studentError;

      // 선택 과목 저장
      if (studentsToSave.some(s => s.electives?.length)) {
        const electiveRecords = studentsToSave.flatMap((s, idx) => {
          const studentId = insertedStudents?.[idx]?.id;
          return (s.electives || []).map(e => ({
            student_id: studentId,
            raw: e.raw,
            subject_group: e.group,
            subject_name: e.subjectName,
            class_num: e.classNum
          }));
        });

        if (electiveRecords.length > 0) {
          const { error: electiveError } = await supabase
            .from('electives')
            .insert(electiveRecords);
          if (electiveError) throw electiveError;
        }
      }
    }

    // 3. 시간표 데이터 저장 (timetable, timetable1, timetable2, manualTimetable 모두 처리)
    const timetableToSave = partialData.timetable || partialData.timetable1 || partialData.timetable2;
    const timetableSemester = partialData.timetable1 ? 1 : (partialData.timetable2 ? 2 : 1);
    
    if (timetableToSave && timetableToSave.length > 0) {
      const { error: deleteTimeError } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('workspace_id', code)
        .eq('is_manual', false)
        .eq('semester', timetableSemester);
      
      if (deleteTimeError) throw deleteTimeError;

      const timetableRecords = timetableToSave.map(t => ({
        workspace_id: code,
        teacher_name: t.teacherName,
        grade: t.grade,
        class: t.classNum,
        subject_name: t.subjectName,
        is_common: t.isCommon || false,
        is_manual: false,
        semester: timetableSemester
      }));

      const { error: timetableError } = await supabase
        .from('timetable_entries')
        .insert(timetableRecords);
      if (timetableError) throw timetableError;
    }

    // 4. 수동 시간표 저장
    if (partialData.manualTimetable && partialData.manualTimetable.length > 0) {
      const manualRecords = partialData.manualTimetable.map(t => ({
        workspace_id: code,
        teacher_name: t.teacherName,
        grade: t.grade,
        class: t.classNum,
        subject_name: t.subjectName,
        is_common: false,
        is_manual: true,
        semester: 1
      }));

      const { error: manualError } = await supabase
        .from('timetable_entries')
        .insert(manualRecords);
      if (manualError) throw manualError;
    }
  } catch (err) {
    console.error("Critical Save Error:", err);
    alert("서버 저장 중 오류가 발생했습니다. 화면을 새로고침해주세요.");
  }
};

export const clearWorkspace = async (code: string) => {
  if (!supabase) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${code}`);
    return;
  }
  try {
    // Delete all related data in cascade order
    await supabase.from('corrections').delete().eq('workspace_id', code);
    await supabase.from('timetable_entries').delete().eq('workspace_id', code);
    await supabase.from('students').delete().eq('workspace_id', code);
    await supabase.from('workspaces').delete().eq('id', code);
  } catch (err) {
    console.error("Clear workspace error:", err);
  }
};

/**
 * 수정 사항을 추가합니다
 */
export const addCorrection = async (code: string, correction: Correction) => {
  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    const existing = raw ? JSON.parse(raw) : { corrections: [] };
    const corrections = Array.isArray(existing.corrections) ? existing.corrections : [];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify({
      ...existing,
      corrections: [...corrections, correction]
    }));
    return;
  }

  try {
    const { error } = await supabase.from('corrections').insert({
      id: correction.id,
      workspace_id: code,
      student_id: correction.studentId || null,
      student_name: correction.studentName,
      grade_class: correction.gradeClass,
      subject_key: correction.subjectKey,
      subject_name: correction.subjectName,
      before: correction.before,
      after: correction.after,
      teachers: correction.teachers,
      is_completed: correction.isCompleted || false,
      semester: correction.semester || 1,
      created_at: new Date(correction.createdAt).toISOString()
    });

    if (error) throw error;
  } catch (err) {
    console.error("Add correction error:", err);
    alert("수정 사항을 추가하는 중 오류가 발생했습니다.");
  }
};

/**
 * 수정 사항을 삭제합니다
 */
export const deleteCorrection = async (code: string, correctionId: string) => {
  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    const existing = raw ? JSON.parse(raw) : { corrections: [] };
    const corrections: any[] = Array.isArray(existing.corrections) ? existing.corrections : [];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify({
      ...existing,
      corrections: corrections.filter((c: any) => c.id !== correctionId)
    }));
    return;
  }

  try {
    const { error } = await supabase
      .from('corrections')
      .delete()
      .eq('id', correctionId)
      .eq('workspace_id', code);

    if (error) throw error;
  } catch (err) {
    console.error("Delete correction error:", err);
    alert("수정 사항을 삭제하는 중 오류가 발생했습니다.");
  }
};

/**
 * 수정 사항의 완료 상태를 업데이트합니다
 */
export const updateCorrectionStatus = async (code: string, correctionId: string, isCompleted: boolean) => {
  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    const existing = raw ? JSON.parse(raw) : { corrections: [] };
    const corrections: any[] = Array.isArray(existing.corrections) ? existing.corrections : [];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify({
      ...existing,
      corrections: corrections.map((c: any) => c.id === correctionId ? {
        ...c,
        isCompleted,
        completedAt: isCompleted ? Date.now() : undefined
      } : c)
    }));
    return;
  }

  try {
    const { error } = await supabase
      .from('corrections')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', correctionId)
      .eq('workspace_id', code);

    if (error) throw error;
  } catch (err) {
    console.error("Update correction status error:", err);
    alert("수정 사항 상태를 업데이트하는 중 오류가 발생했습니다.");
  }
};
