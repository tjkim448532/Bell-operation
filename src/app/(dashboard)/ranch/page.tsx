import { Suspense } from 'react';
import RanchAnimalSection from '@/components/RanchAnimalSection';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '벨포레 목장 동물 관리 대장 | 블랙스톤 벨포레',
  description: '구글 스프레드시트 연동 벨포레 목장 동물 개체군 및 보더콜리/승용마 실시간 관리 대장',
};

export default function RanchAnimalsPage() {
  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#00AE95]" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">목장 동물 관리 대장을 불러오는 중입니다...</p>
              <p className="text-2xs text-slate-400 mt-1">구글 시트 실시간 동기화 중</p>
            </div>
          </div>
        }
      >
        <RanchAnimalSection />
      </Suspense>
    </div>
  );
}
