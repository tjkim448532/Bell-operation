import React from 'react';

const formatRevenue = (val: number) => val ? val.toLocaleString('ko-KR') : '0';

export interface GridProps {
  data: any[]; // V6 divisions array
  grandTotal?: number;
}

export default function RevenueGrid({ data, grandTotal }: GridProps) {
  // 프론트엔드 연산(reduce 등) 완전 배제. 백엔드가 준 완제품 구조(3-Depth) 그대로 렌더링.
  
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    
    (data || []).forEach((division: any, divIdx: number) => {
      const venues = division.venues || [];
      if (venues.length === 0) return;

      // Calculate division rowSpan
      const divRowSpan = venues.reduce((acc: number, v: any) => acc + Math.max((v.tickets || []).length, 1), 0);

      venues.forEach((venue: any, venueIdx: number) => {
        const tickets = venue.tickets && venue.tickets.length > 0 ? venue.tickets : [{ ticketName: '매출 없음', revenue: 0 }];
        const venueRowSpan = tickets.length;

        tickets.forEach((ticket: any, ticketIdx: number) => {
          const isFirstDivision = venueIdx === 0 && ticketIdx === 0;
          const isFirstVenue = ticketIdx === 0;

          rows.push(
            <tr key={`${divIdx}-${venueIdx}-${ticketIdx}`} className="border-b hover:bg-gray-50/5 text-gray-200">
              {isFirstDivision && (
                <td rowSpan={divRowSpan} className="p-3 font-bold bg-gray-800 border-r border-gray-700 text-center">
                  <div className="flex flex-col h-full justify-center">
                    <span>{division.orgDivision}</span>
                    <span className="text-xs text-gray-400 mt-2 block">
                      소계: <strong className="text-emerald-400">{formatRevenue(division.divisionSubtotal)}</strong>
                    </span>
                  </div>
                </td>
              )}
              {isFirstVenue && (
                <td rowSpan={venueRowSpan} className="p-3 font-semibold bg-gray-800/50 border-r border-gray-700">
                  <div className="flex flex-col h-full justify-center">
                    <span>{venue.venueName}</span>
                    <span className="text-xs text-gray-400 mt-1 block">
                      소계: <strong className="text-blue-400">{formatRevenue(venue.venueSubtotal)}</strong>
                    </span>
                  </div>
                </td>
              )}
              <td className="p-3 border-r border-gray-700 text-gray-300">
                {ticket.ticketName}
              </td>
              <td className="p-3 text-right font-medium text-emerald-400 tabular-nums">
                {formatRevenue(ticket.revenue)}
              </td>
            </tr>
          );
        });
      });
    });

    return rows;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 shadow-sm rounded-lg border border-slate-800">
      <div className="overflow-auto flex-grow custom-scrollbar">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-950 text-slate-300 sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="p-4 border-r border-slate-800 w-48 text-center">대분류 (Division)</th>
              <th className="p-4 border-r border-slate-800 w-64">영업장 (Venue)</th>
              <th className="p-4 border-r border-slate-800">티켓/분류 (Ticket)</th>
              <th className="p-4 text-right w-48">실적 (순매출)</th>
            </tr>
          </thead>
          <tbody>
            {renderRows()}
          </tbody>
          <tfoot className="bg-slate-950 sticky bottom-0 z-10 border-t border-slate-800">
            <tr>
              <td colSpan={3} className="p-4 border-r border-slate-800 font-bold text-center text-slate-300">
                총합계 (Grand Total)
              </td>
              <td className="p-4 text-right font-bold text-emerald-400 tabular-nums text-lg">
                {formatRevenue(grandTotal || 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
