'use client';

import React from 'react';

// 4. 포맷팅 (본부장 절대 룰)
const formatNumber = (val: number | undefined) => {
  if (val === undefined || val === null) return '0';
  return Math.round(val).toLocaleString('ko-KR');
};

export interface OrgVenue {
  venueName: string;
  categoryCode: string;
  ticketGroup: string;
  revenue: number;
}

export interface OrgDivision {
  orgDivision: string;
  subtotal: number;
  venues: OrgVenue[];
}

export interface OrgRevenueResponseData {
  period: {
    startDate: string;
    endDate: string;
  };
  grandTotal: number;
  divisions: OrgDivision[];
}

interface OrgRevenueGridProps {
  data: OrgRevenueResponseData;
}

export default function OrgRevenueGrid({ data }: OrgRevenueGridProps) {
  if (!data || !data.divisions) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
        <p className="text-slate-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-sm rounded-xl border border-slate-200">
      <div className="overflow-auto flex-grow">
        <table className="min-w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-800 text-white sticky top-0 z-10">
            <tr>
              <th className="p-3 border-r font-medium border-slate-700">본부</th>
              <th className="p-3 border-r font-medium border-slate-700">영업장</th>
              <th className="p-3 border-r font-medium border-slate-700">대분류(Category)</th>
              <th className="p-3 border-r font-medium border-slate-700">티켓그룹</th>
              <th className="p-3 font-medium text-right border-slate-700">실적(순매출)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {data.divisions.map((division, divIdx) => {
              // 본부 소계 행을 먼저 그릴지? 아니면 venues의 첫번째 항목에 rowspan 할지.
              // "대시보드 첫 번째 컬럼 (본부): divisions[i].orgDivision 값을 렌더링하며, 동일 본부 내의 영업장 개수(venues.length)만큼 UI 컴포넌트에서 동적 rowSpan(셀 병합)을 처리하십시오."
              
              if (!division.venues || division.venues.length === 0) return null;

              const rows = division.venues.map((venue, venueIdx) => {
                const isFirstVenue = venueIdx === 0;
                
                return (
                  <tr key={`${divIdx}-${venueIdx}`} className="hover:bg-slate-50 transition-colors">
                    {isFirstVenue && (
                      <td 
                        rowSpan={division.venues.length} 
                        className="p-3 border-r border-b font-bold bg-slate-50 align-top whitespace-normal"
                      >
                        <div className="flex flex-col h-full justify-between">
                          <span>{division.orgDivision}</span>
                          <span className="text-xs text-slate-500 mt-2 block">
                            소계: <strong className="text-indigo-600">{formatNumber(division.subtotal)}</strong>
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="p-3 border-r border-slate-100 font-semibold">{venue.venueName}</td>
                    <td className="p-3 border-r border-slate-100 text-slate-600">{venue.categoryCode}</td>
                    <td className="p-3 border-r border-slate-100 text-slate-600">{venue.ticketGroup}</td>
                    <td className="p-3 text-right font-medium tabular-nums text-slate-700">
                      {formatNumber(venue.revenue)}
                    </td>
                  </tr>
                );
              });
              
              // We also want to render the subtotal row explicitly if needed, but we put it in the rowspan cell to save space.
              // Let's add a clear subtotal row at the end of each division just in case, or keep it in the first cell as above.
              // The instructions didn't specify exactly, just "동일 본부 내의 영업장 개수(venues.length)만큼 UI 컴포넌트에서 동적 rowSpan(셀 병합)을 처리하십시오."
              return <React.Fragment key={divIdx}>{rows}</React.Fragment>;
            })}
          </tbody>
          <tfoot className="bg-slate-100 sticky bottom-0 z-10">
            <tr>
              <td colSpan={4} className="p-3 border-r font-bold text-center text-slate-700 border-t-2 border-slate-300">
                총합계 (Grand Total)
              </td>
              <td className="p-3 text-right font-bold text-indigo-700 tabular-nums border-t-2 border-slate-300 text-base">
                {formatNumber(data.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
