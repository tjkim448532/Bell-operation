export interface CategoryMetaItem {
  icon: string;
  color: string;
  bg: string;
  badgeBg: string;
}

// 16대 친화형 카테고리 메타 (아이콘, 색상 테마)
export const CATEGORY_META: Record<string, CategoryMetaItem> = {
  '정규직 직원 급여': { icon: '👔', color: 'text-blue-700', bg: 'bg-blue-50/40', badgeBg: 'bg-blue-100 text-blue-800' },
  '아르바이트비 (알바비)': { icon: '⏱️', color: 'text-teal-700', bg: 'bg-teal-50/40', badgeBg: 'bg-teal-100 text-teal-800' },
  '직원 4대보험과 국민연금 (직원비용)': { icon: '🛡️', color: 'text-slate-700', bg: 'bg-slate-50/50', badgeBg: 'bg-slate-100 text-slate-800' },
  '직원 밥값과 간식비': { icon: '🍚', color: 'text-orange-700', bg: 'bg-orange-50/40', badgeBg: 'bg-orange-100 text-orange-800' },
  '손님과 시설 안전 보험료': { icon: '🏢', color: 'text-slate-700', bg: 'bg-slate-50/50', badgeBg: 'bg-slate-100 text-slate-800' },
  '전기세와 물·가스 요금': { icon: '⚡', color: 'text-amber-700', bg: 'bg-amber-50/40', badgeBg: 'bg-amber-100 text-amber-800' },
  '인터넷과 전화 요금': { icon: '📶', color: 'text-cyan-700', bg: 'bg-cyan-50/40', badgeBg: 'bg-cyan-100 text-cyan-800' },
  '영업장에 필요한 물건 사기': { icon: '🛍️', color: 'text-pink-700', bg: 'bg-pink-50/40', badgeBg: 'bg-pink-100 text-pink-800' },
  '정수기와 차량 빌린 돈': { icon: '🚗', color: 'text-sky-700', bg: 'bg-sky-50/40', badgeBg: 'bg-sky-100 text-sky-800' },
  '현수막·배너 만들기와 홍보비': { icon: '🎨', color: 'text-emerald-700', bg: 'bg-emerald-50/40', badgeBg: 'bg-emerald-100 text-emerald-800' },
  '고장난 시설과 기구 고치기': { icon: '🔧', color: 'text-red-700', bg: 'bg-red-50/40', badgeBg: 'bg-red-100 text-red-800' },
  '리조트 차량 기름값과 정비': { icon: '⛽', color: 'text-stone-700', bg: 'bg-stone-50/40', badgeBg: 'bg-stone-100 text-stone-800' },
  '카드단말기·서비스 수수료': { icon: '💳', color: 'text-rose-700', bg: 'bg-rose-50/40', badgeBg: 'bg-rose-100 text-rose-800' },
  '나라와 지자체에낸 세금': { icon: '🏛️', color: 'text-slate-700', bg: 'bg-slate-50/40', badgeBg: 'bg-slate-100 text-slate-800' },
  '나라와 지자체에 낸 세금': { icon: '🏛️', color: 'text-slate-700', bg: 'bg-slate-50/40', badgeBg: 'bg-slate-100 text-slate-800' },
  '좋은 일 돕기 (기부금)': { icon: '🤝', color: 'text-green-700', bg: 'bg-green-50/40', badgeBg: 'bg-green-100 text-green-800' },
  '기타 운영 지출': { icon: '📦', color: 'text-gray-700', bg: 'bg-gray-50/40', badgeBg: 'bg-gray-100 text-gray-800' },
};
