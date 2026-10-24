import React from 'react';
import { DateProvider } from '@/contexts/DateContext';

export const metadata = {
  title: '매장별 이용률 계산 | 벨포레 리조트',
  description: '숙박객(골프 제외) 및 데일리 워크인 고객 통합 모수 기반 매장별 실측 이용률 대시보드',
};

export default function VenueUsageRateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateProvider>
      <div className="w-full max-w-[1920px] mx-auto p-6 lg:p-8 space-y-8 pb-16">
        {children}
      </div>
    </DateProvider>
  );
}
