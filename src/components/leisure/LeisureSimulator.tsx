"use client";

import LeisurePricingSimulator from '@/components/dashboard/LeisurePricingSimulator';
import { Ticket, Sparkles } from 'lucide-react';

export default function LeisureSimulator() {
  return (
    <div className="w-full max-w-[1920px] mx-auto p-8 space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit mb-2">
            <Sparkles size={14} />
            <span>레저본부 수익 시뮬레이션 시스템</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-7 h-7 text-emerald-600" />
            티켓 가격 & 수요 탄력성 시뮬레이터
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            각 레저 영업장의 가장 마지막 연도(2026년) 누적 트랜잭션 판매금액 Top 5 티켓 단가 변동 및 고객 수요 탄력성(±10%, ±30% 등)에 따른 예상 월·연 매출을 시뮬레이션합니다.
          </p>
        </div>
      </div>

      {/* Main Simulator Component */}
      <LeisurePricingSimulator />
    </div>
  );
}
