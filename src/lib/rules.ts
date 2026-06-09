export type HeuristicRule = {
  id: string;
  category: string;      // 대분류 (예: 인건비)
  targetTerm: string;    // 최종 매핑될 계정과목명 (예: 인건비-정직원)
  keywords: string[];    // 이 단어들이 포함되어 있으면 이 계정과목으로 매핑
  priority: number;      // 우선순위 (높을수록 먼저 평가됨)
};

export const HEURISTIC_RULES: HeuristicRule[] = [
  // ==========================================
  // 1. 보험료 관련 (Insurance)
  // ==========================================
  {
    id: 'ins-health',
    category: '보험료',
    targetTerm: '건강보험료',
    keywords: ['건강보험', '건보료'],
    priority: 100,
  },
  {
    id: 'ins-pension',
    category: '보험료',
    targetTerm: '국민연금',
    keywords: ['국민연금', '연금보험'],
    priority: 100,
  },
  {
    id: 'ins-employment',
    category: '보험료',
    targetTerm: '고용보험료',
    keywords: ['고용보험'],
    priority: 100,
  },
  {
    id: 'ins-accident',
    category: '보험료',
    targetTerm: '산재보험료',
    keywords: ['산재보험'],
    priority: 100,
  },
  {
    id: 'ins-liability',
    category: '보험료',
    targetTerm: '배상책임보험료',
    keywords: ['배상책임', '책임보험', '영업배상'],
    priority: 100,
  },
  {
    id: 'ins-fire',
    category: '보험료',
    targetTerm: '화재보험료',
    keywords: ['화재보험'],
    priority: 100,
  },
  {
    id: 'ins-car',
    category: '보험료',
    targetTerm: '자동차보험료',
    keywords: ['자동차보험', '차량보험'],
    priority: 100,
  },
  {
    id: 'ins-general',
    category: '보험료',
    targetTerm: '기타보험료',
    keywords: ['보험료', '보험'],
    priority: 50, // 다른 상세 보험료 조건에 안 맞고 '보험'만 있을 때
  },

  // ==========================================
  // 2. 인건비 관련 (Labor Costs)
  // ==========================================
  {
    id: 'labor-fulltime',
    category: '인건비',
    targetTerm: '인건비-정직원',
    keywords: ['정직원', '급여', '기본급', '월급'],
    priority: 100,
  },
  {
    id: 'labor-daily',
    category: '인건비',
    targetTerm: '인건비-일용직',
    keywords: ['일용직', '알바', '아르바이트', '파트타임', '일당'],
    priority: 100,
  },
  {
    id: 'labor-welfare',
    category: '인건비',
    targetTerm: '인건비-복리후생비',
    keywords: ['복지', '복리후생', '식대', '간식', '회식', '야식', '식사'],
    priority: 100,
  },

  // ==========================================
  // 3. 임차/렌탈 관련 (Rental)
  // ==========================================
  {
    id: 'rent-water',
    category: '임차/렌탈',
    targetTerm: '정수기 렌탈료',
    keywords: ['정수기'],
    priority: 90,
  },
  {
    id: 'rent-aed',
    category: '임차/렌탈',
    targetTerm: '제세동기 렌탈료',
    keywords: ['제세동기', 'aed'],
    priority: 90,
  },
  {
    id: 'rent-terminal',
    category: '임차/렌탈',
    targetTerm: '단말기 대금',
    keywords: ['자판기', '단말기'],
    priority: 90,
  },
  {
    id: 'rent-general',
    category: '임차/렌탈',
    targetTerm: '기타 렌탈/임차료',
    keywords: ['렌탈', '임차료', '대여료'],
    priority: 80,
  },

  // ==========================================
  // 4. 수수료 관련 (Fees)
  // ==========================================
  {
    id: 'fee-service',
    category: '지급수수료',
    targetTerm: '서비스 수수료',
    keywords: ['이용료', '플랫폼수수료'],
    priority: 90,
  },
  {
    id: 'fee-general',
    category: '지급수수료',
    targetTerm: '지급 수수료',
    keywords: ['수수료'],
    priority: 80,
  }
];

export function applyHeuristicRules(originalTerm: string, description: string, vendor: string): string {
  const textToSearch = `${originalTerm} ${description} ${vendor}`.toLowerCase();
  
  // 우선순위가 높은 순으로 정렬
  const sortedRules = [...HEURISTIC_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const matched = rule.keywords.some(keyword => textToSearch.includes(keyword.toLowerCase()));
    if (matched) {
      return rule.targetTerm;
    }
  }

  return originalTerm; // 규칙에 매칭되는 것이 없으면 원본 그대로 반환
}
