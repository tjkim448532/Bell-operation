import { Suspense } from 'react';
import MonthlyVisitorTargetDashboard from '@/components/venue-usage/MonthlyVisitorTargetDashboard';

export default function MonthlyVisitorTargetsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#00AE95] border-t-transparent mb-3" />
          <p className="text-slate-500 font-medium text-sm">
            월별 방문객 목표 및 영업장별 이용률 목표 대조표를 불러오는 중입니다...
          </p>
        </div>
      }
    >
      <MonthlyVisitorTargetDashboard />
    </Suspense>
  );
}
