"use client";

import React, { useMemo } from 'react';
import { formatNumber } from '@/lib/formatters';
import { Layers, Building2, Tag } from 'lucide-react';

export interface HierarchicalRow {
  partName: string;
  venueName: string;
  ticketGroup: string;
  revenue: number;
  visitorCount: number;
  spendPerGuest: number;
}

interface Props {
  rows: HierarchicalRow[];
}

export default function HierarchicalRowspanTable({ rows }: Props) {
  // Rowspan 동적 계산 (Part 및 Venue 단위 계층 병합)
  const processedRows = useMemo(() => {
    const partSpanMap: Record<string, number> = {};
    const venueSpanMap: Record<string, number> = {};

    rows.forEach((r) => {
      partSpanMap[r.partName] = (partSpanMap[r.partName] || 0) + 1;
      const venueKey = `${r.partName}__${r.venueName}`;
      venueSpanMap[venueKey] = (venueSpanMap[venueKey] || 0) + 1;
    });

    const renderedPart = new Set<string>();
    const renderedVenue = new Set<string>();

    return rows.map((r) => {
      const isFirstPart = !renderedPart.has(r.partName);
      if (isFirstPart) renderedPart.add(r.partName);

      const venueKey = `${r.partName}__${r.venueName}`;
      const isFirstVenue = !renderedVenue.has(venueKey);
      if (isFirstVenue) renderedVenue.add(venueKey);

      return {
        ...r,
        partRowSpan: isFirstPart ? partSpanMap[r.partName] : 0,
        venueRowSpan: isFirstVenue ? venueSpanMap[venueKey] : 0,
      };
    });
  }, [rows]);

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalVisitors = rows.reduce((sum, r) => sum + r.visitorCount, 0);
  const avgSpend = totalVisitors > 0 ? Math.round(totalRevenue / totalVisitors) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            레저본부 계층형 세부 실적 (대분류 ➔ 영업장 ➔ 티켓그룹)
          </h3>
          <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
            총 {rows.length}개 항목
          </span>
        </div>
        <div className="text-2xs text-slate-500 font-medium">
          * 부가세 제외 순매출 기준 (`#,##0` 서식 적용)
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 border-r border-slate-200 w-36">
                <div className="flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-400" />
                  <span>레저 파트 (대분류)</span>
                </div>
              </th>
              <th className="py-3 px-4 border-r border-slate-200 w-44">
                <div className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-400" />
                  <span>세부 영업장</span>
                </div>
              </th>
              <th className="py-3 px-4 border-r border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Tag size={13} className="text-slate-400" />
                  <span>상품 / 티켓군</span>
                </div>
              </th>
              <th className="py-3 px-4 text-right border-r border-slate-200 w-36">순매출</th>
              <th className="py-3 px-4 text-right border-r border-slate-200 w-28">이용객(명)</th>
              <th className="py-3 px-4 text-right w-28">객단가</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                {row.partRowSpan > 0 && (
                  <td
                    rowSpan={row.partRowSpan}
                    className="py-3 px-4 font-bold text-slate-900 bg-white border-r border-slate-200 align-top"
                  >
                    <div className="sticky top-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs tracking-tight">{row.partName}</span>
                    </div>
                  </td>
                )}
                {row.venueRowSpan > 0 && (
                  <td
                    rowSpan={row.venueRowSpan}
                    className="py-3 px-4 font-semibold text-slate-800 bg-slate-50/30 border-r border-slate-200 align-top"
                  >
                    <span className="text-xs">{row.venueName}</span>
                  </td>
                )}
                <td className="py-3 px-4 border-r border-slate-200 text-slate-700">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-2xs font-medium text-slate-600">
                    {row.ticketGroup}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 border-r border-slate-200">
                  {formatNumber(row.revenue)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700 border-r border-slate-200">
                  {formatNumber(row.visitorCount)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                  {formatNumber(row.spendPerGuest)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Grand Total Row */}
          <tfoot className="bg-slate-900 text-white font-bold text-xs">
            <tr>
              <td colSpan={3} className="py-3.5 px-4 text-center tracking-wider text-slate-300">
                레저본부 전체 합계 (Grand Total)
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-emerald-400 text-sm">
                {formatNumber(totalRevenue)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                {formatNumber(totalVisitors)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-amber-300">
                {formatNumber(avgSpend)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
