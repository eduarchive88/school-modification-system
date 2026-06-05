
import { createClient } from '@supabase/supabase-js';
import { WorkspaceData, Correction } from '../types';

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

/**
 * 워크스페이스 데이터를 가져옵니다.
 * Supabase 연결 실패 시 로컬 스토리지로 폴백합니다.
 */
export const getWorkspace = async (code: string): Promise<WorkspaceData> => {
  if (!supabase) {
    // 클라우드 미연결 시 로컬 스토리지에서 읽기
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    return raw ? JSON.parse(raw) : { students: [], timetable: [], corrections: [] };
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('data')
      .eq('id', code)
      .maybeSingle();

    if (error) {
      console.error("Supabase Fetch Error:", error);
      throw error;
    }
    
    if (!data) return { students: [], timetable: [], corrections: [] };
    return data.data as WorkspaceData;
  } catch (err: any) {
    console.error("Critical Fetch Error:", err);
    
    // 네트워크 오류 또는 Supabase 서버 다운 여부 판별
    const isNetworkError = 
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError') ||
      err?.code === 'PGRST000' ||
      err?.code === '503' ||
      !navigator.onLine;

    if (isNetworkError) {
      // 서버 다운 시: 로컬 스토리지에 캐시된 데이터가 있으면 폴백
      const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
      if (cached) {
        console.warn("Supabase 연결 실패 - 로컬 캐시로 폴백합니다.");
        return JSON.parse(cached);
      }
      // 캐시도 없으면 서버 오류임을 알리는 에러를 던짐
      const serverError = new Error('SERVER_DOWN');
      throw serverError;
    }
    
    // 그 외 에러 (RLS 위반, 쿼리 오류 등)는 그대로 던짐
    throw err;
  }
};

/**
 * [핵심] 데이터 초기화(날아감)를 방지하는 개선된 저장 함수
 */
export const saveWorkspace = async (code: string, partialData: Partial<WorkspaceData>) => {
  // 1. 비정상적인 빈 데이터 저장 시도 차단
  if (!partialData || Object.keys(partialData).length === 0) return;

  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    const existing = raw ? JSON.parse(raw) : { students: [], timetable: [], corrections: [] };
    const updated = { ...existing, ...partialData };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify(updated));
    return;
  }

  try {
    // 2. 저장 직전에 현재 DB의 실제 상태를 다시 가져옴 (Race Condition 방지)
    const { data: latestRaw, error: fetchError } = await supabase
      .from('workspaces')
      .select('data')
      .eq('id', code)
      .maybeSingle();

    if (fetchError) {
      console.error("저장 전 DB 확인 실패. 데이터 보호를 위해 저장을 중단합니다.", fetchError);
      return;
    }

    const existingInDB = latestRaw?.data || {};
    
    // 3. 데이터 초기화 방지 로직 (Safety Guard)
    // 만약 DB에는 데이터가 있는데, 들어온 partialData가 비정상적으로 비어있다면 업데이트 중단
    const isDataLossSuspected = (key: keyof WorkspaceData) => {
      const dbVal = existingInDB[key];
      const newVal = partialData[key];
      // DB에 배열 데이터가 존재하는데, 들어온 데이터가 undefined이거나 빈 배열인 경우 방어
      if (Array.isArray(dbVal) && dbVal.length > 0) {
        if (newVal === undefined) return false; // partial 업데이트이므로 무시 가능
        if (Array.isArray(newVal) && newVal.length === 0) return true; // 위험 감지!
      }
      return false;
    };

    // 정정 내역(corrections)이나 학생 명단이 갑자기 빈 배열로 들어오면 저장을 거부함
    if (isDataLossSuspected('corrections') || isDataLossSuspected('students1')) {
      console.error("데이터 유실 시도 감지: 빈 배열로의 덮어쓰기가 거부되었습니다.");
      return;
    }

    // 4. 안전한 병합 (Merge)
    const updated = { ...existingInDB, ...partialData };

    const { error: upsertError } = await supabase
      .from('workspaces')
      .upsert({ id: code, data: updated }, { onConflict: 'id' });
      
    if (upsertError) throw upsertError;
  } catch (err) {
    console.error("Critical Save Error:", err);
    // 사용자에게 경고창을 띄워 현재 작업 중인 데이터가 날아가지 않도록 알림
    alert("서버 저장 중 오류가 발생했습니다. 데이터를 덮어쓰지 않기 위해 일시 중단되었습니다. 화면을 새로고침해주세요.");
  }
};

export const clearWorkspace = async (code: string) => {
  if (!supabase) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${code}`);
    return;
  }
  await supabase.from('workspaces').delete().eq('id', code);
};

export const addCorrection = async (code: string, correction: Correction) => {
  const latest = await getWorkspace(code);
  const currentCorrections = Array.isArray(latest.corrections) ? latest.corrections : [];
  await saveWorkspace(code, { corrections: [...currentCorrections, correction] });
};

export const deleteCorrection = async (code: string, correctionId: string) => {
  const latest = await getWorkspace(code);
  const currentCorrections = Array.isArray(latest.corrections) ? latest.corrections : [];
  const filtered = currentCorrections.filter(c => c.id !== correctionId);
  await saveWorkspace(code, { corrections: filtered });
};

export const updateCorrectionStatus = async (code: string, correctionId: string, isCompleted: boolean) => {
  const latest = await getWorkspace(code);
  const currentCorrections = Array.isArray(latest.corrections) ? latest.corrections : [];
  const updatedList = currentCorrections.map(c => {
    if (c.id === correctionId) {
      return {
        ...c,
        isCompleted,
        completedAt: isCompleted ? Date.now() : undefined
      };
    }
    return c;
  });
  await saveWorkspace(code, { corrections: updatedList });
};
