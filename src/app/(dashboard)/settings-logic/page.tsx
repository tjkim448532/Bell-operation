'use client';

import { Info, ShieldCheck } from 'lucide-react';

export default function SettingsLogicPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">비용 데이터 관리 원칙 안내</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
          실제 원본 데이터를 100% 보존하고, 관리자가 직접 공식 부서로 배정하는 데이터 무결성 운영 원칙을 안내합니다.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">데이터 무결성 및 직접 배정 원칙</h3>
            <div className="mt-2 text-xs sm:text-sm text-slate-600 space-y-3">
              <p>
                <strong>모든 업로드 데이터는 원형 그대로 완벽하게 보존됩니다.</strong>
              </p>
              <p>
                사용자가 업로드한 엑셀 비용 데이터의 계정과목명과 금액은 시스템에 의해 임의로 변형되지 않고, 원본 그대로 안전하게 저장됩니다.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 mb-2">데이터 분류 및 통계 반영 절차</p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>새로운 비용 내역이 발생하면, 칸반 보드의 <strong>'미분류'</strong> 영역에 즉시 원본 이름 그대로 표시됩니다.</li>
                  <li>운영팀은 <strong>[비용 부서 배정 (칸반보드)]</strong> 화면에서 직접 미분류 항목을 원하는 부서 기둥으로 드래그 앤 드롭하여 배정합니다.</li>
                  <li>배정된 규칙은 전사 손익계산서 및 부서별 실적 분석에 즉시 실시간 반영됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
