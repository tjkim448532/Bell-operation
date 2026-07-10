export type HeuristicRule = {
  id: string;
  category: string;
  targetTerm: string;
  keywords: string[];
  priority: number;
};

// [SSOT 적용] 100줄이 넘던 하드코딩 휴리스틱 파싱 규칙(HEURISTIC_RULES) 전면 철거 완료.
// 프론트엔드가 원본 엑셀의 계정과목 데이터를 자의적으로 변경/조작하는 것을 영구적으로 방지합니다.
// 모든 매핑은 오직 파이어베이스(SSOT)의 칸반 보드 설정에 의해서만 결정되어야 합니다.
export const HEURISTIC_RULES: HeuristicRule[] = [];

export function applyHeuristicRules(originalTerm: string, description: string, vendor: string): string {
  // 휴리스틱 로직이 제거되었으므로, 원본 텍스트를 100% 그대로 반환하여 데이터의 무결성을 보존합니다.
  return originalTerm;
}
