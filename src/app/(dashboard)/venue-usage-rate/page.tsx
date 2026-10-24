import { Suspense } from 'react';
import VenueUsageRateDashboard from '@/components/venue-usage/VenueUsageRateDashboard';

export default function VenueUsageRatePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
          <p className="text-slate-500 font-medium text-sm">매장별 이용률 대시보드를 불러오는 중입니다...</p>
        </div>
      }
    >
      <VenueUsageRateDashboard />
    </Suspense>
  );
}
