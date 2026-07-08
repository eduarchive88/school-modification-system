
/**
 * 과목명을 비교하기 좋게 정규화합니다.
 * 공백 제거, 로마숫자 통일, 특수문자 제거.
 */
export const normalizeSubjectName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/\s+/g, "")       // 공백 제거
    .replace(/Ⅰ|I/gi, "1")     // 로마숫자 I -> 1
    .replace(/Ⅱ|II/gi, "2")    // 로마숫자 II -> 2
    .replace(/Ⅲ|III/gi, "3")   // 로마숫자 III -> 3
    .replace(/[·\.\-_/()]/g, "") // 구분자 및 괄호 제거
    .trim();
};

/**
 * 포함 관계이지만 실제로는 서로 다른 과목인 쌍을 명시합니다.
 * 예: "국어"는 "중국어" 안에 포함되지만 완전히 다른 과목이므로 차단.
 * 각 쌍은 정규화된 과목명으로 작성합니다.
 */
const SUBJECT_CONFLICT_PAIRS: [string, string][] = [
  ['국어', '중국어'],
  ['국어', '한국어'],
  ['어', '중국어'],   // 기타 짧은 단어가 중국어와 혼동될 경우 대비
];

/**
 * 두 과목명이 실질적으로 동일하거나 포함 관계인지 판단합니다.
 * 예: "지구과학" vs "지구과학 I" -> true
 * 단, 우연히 문자가 겹치는 다른 과목(국어 vs 중국어 등)은 false 처리.
 */
export const isSameSubject = (nameA: string, nameB: string): boolean => {
  const normA = normalizeSubjectName(nameA);
  const normB = normalizeSubjectName(nameB);
  
  if (!normA || !normB) return false;

  // 완전 일치 시 바로 true
  if (normA === normB) return true;

  // 포함 관계 체크 전, 충돌 쌍이면 false 반환 (국어 ↔ 중국어 등)
  const isConflict = SUBJECT_CONFLICT_PAIRS.some(([a, b]) => {
    const pa = normalizeSubjectName(a);
    const pb = normalizeSubjectName(b);
    return (normA === pa && normB.includes(pa)) || (normB === pa && normA.includes(pa)) ||
           (normA === pb && normB.includes(pb)) || (normB === pb && normA.includes(pb));
  });
  if (isConflict) return false;

  // 한쪽이 다른 쪽에 포함되면 동일 과목으로 간주 (예: 지구과학 vs 지구과학1)
  return normA.includes(normB) || normB.includes(normA);
};

/**
 * 학번에서 학년/반을 추출합니다.
 */
export const parseGradeClass = (studentId: string | number) => {
  const s = String(studentId).replace(/\D/g, "");
  const grade = parseInt(s.substring(0, 1));
  const classNum = parseInt(s.substring(1, 3));
  return { grade, classNum };
};

/**
 * 교사 이름 추출: 오직 C열에서 괄호 안의 이름만 추출
 */
export const extractTeacherName = (raw: any): string | null => {
  const s = String(raw ?? "").trim();
  const match = s.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
};
