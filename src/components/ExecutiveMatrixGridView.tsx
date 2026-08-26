'use client';

import React, { useMemo } from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export interface MatrixRowData {
  id?: string | number;
  division: string;        // 대분류 (예: 레저본부, 리조트 등)
  department: string;      // 중분류 (8대 부서: 액티비티, 목장, 미디어아트센터, 놀이동산, 모토아레나 등)
  venue: string;           // 영업장 (예: 루지, 사계절썰매장, 짚라인 등)
  ticketGroup: string;     // 티켓그룹 / 세부 항목 (예: 온라인 티켓, 현장 POS 등)
  netAmount: number;       // 순매출 (1원 단위 실측치)
  visitors?: number;       // 방문객
  spendPerGuest?: number;  // 객단가 (순매출 ÷ 방문객)
  isSubtotal?: boolean;    // 백엔드 소계 여부
  isGrandTotal?: boolean;  // 백엔드 총계 여부
  note?: string;           // 비고
}

export interface SpannedMatrixRow extends MatrixRowData {
  divisionSpan: number;
  departmentSpan: number;
  venueSpan: number;
}

/**
 * 8대 부서 계층별 연속 동일 셀 동적 Rowspan 계산 함수
 * '대분류 ➔ 중분류 ➔ 영업장' 순서로 연속 블록을 스캔하여 동적으로 rowspan을 부여합니다.
 */
export function calculateHierarchicalRowSpans(rows: MatrixRowData[]): SpannedMatrixRow[] {
  if (!rows || rows.length === 0) return [];

  const result: SpannedMatrixRow[] = rows.map(r => ({
    ...r,
    divisionSpan: 1,
    departmentSpan: 1,
    venueSpan: 1
  }));

  const n = result.length;
  let i = 0;

  while (i < n) {
    // 소계나 총계 행은 단일 행 전체 병합 처리
    if (result[i].isSubtotal || result[i].isGrandTotal) {
      result[i].divisionSpan = 1;
      result[i].departmentSpan = 1;
      result[i].venueSpan = 1;
      i++;
      continue;
    }

    const currentDiv = result[i].division;
    let divCount = 1;

    // 1단계: 대분류(Division) 연속 구간 탐색
    while (
      i + divCount < n &&
      !result[i + divCount].isSubtotal &&
      !result[i + divCount].isGrandTotal &&
      result[i + divCount].division === currentDiv
    ) {
      divCount++;
    }

    result[i].divisionSpan = divCount;
    for (let k = 1; k < divCount; k++) {
      result[i + k].divisionSpan = 0; // 0은 상위 행에 병합됨을 의미 (td 생략)
    }

    // 2단계: 동일 대분류 구간 내에서 중분류(Department) 연속 구간 탐색
    let j = i;
    const divEnd = i + divCount;
    while (j < divEnd) {
      const currentDept = result[j].department;
      let deptCount = 1;
      while (
        j + deptCount < divEnd &&
        !result[j + deptCount].isSubtotal &&
        !result[j + deptCount].isGrandTotal &&
        result[j + deptCount].department === currentDept
      ) {
        deptCount++;
      }

      result[j].departmentSpan = deptCount;
      for (let k = 1; k < deptCount; k++) {
        result[j + k].departmentSpan = 0;
      }

      // 3단계: 동일 중분류 구간 내에서 영업장(Venue) 연속 구간 탐색
      let v = j;
      const deptEnd = j + deptCount;
      while (v < deptEnd) {
        const currentVenue = result[v].venue;
        let venueCount = 1;
        while (
          v + venueCount < deptEnd &&
          !result[v + venueCount].isSubtotal &&
          !result[v + venueCount].isGrandTotal &&
          result[v + venueCount].venue === currentVenue
        ) {
          venueCount++;
        }

        result[v].venueSpan = venueCount;
        for (let k = 1; k < venueCount; k++) {
          result[v + k].venueSpan = 0;
        }

        v += venueCount;
      }

      j += deptCount;
    }

    i += divCount;
  }

  return result;
}

interface ExecutiveMatrixGridViewProps {
  data: MatrixRowData[];
  title?: string;
  subtitle?: string;
  dateRange?: string;
}

export default function ExecutiveMatrixGridView({
  data,
  title = '경영진 보고용 V6 계층형 Matrix Grid View',
  subtitle = '대분류 ➔ 중분류(8대 부서) ➔ 영업장 ➔ 티켓그룹 계층별 동적 Rowspan 셀 병합 및 순수 #,##0 서식 렌더링',
  dateRange
}: ExecutiveMatrixGridViewProps) {
  // 동적 Rowspan 계산 수행 (메모이제이션)
  const spannedRows = useMemo(() => calculateHierarchicalRowSpans(data), [data]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {title}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Zero-Proxy SSOT
              </span>
            </h2>
            {dateRange && (
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                {dateRange}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-10.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 w-28 border-r border-slate-200/70 text-center">대분류</th>
              <th className="py-3 px-4 w-32 border-r border-slate-200/70 text-center">중분류 (8대 부서)</th>
              <th className="py-3 px-4 w-36 border-r border-slate-200/70 text-center">영업장 (Facility)</th>
              <th className="py-3 px-4 border-r border-slate-200/70">티켓그룹 / 채널구분</th>
              <th className="py-3 px-4 w-36 text-right border-r border-slate-200/70">실측 매출액 (#,##0)</th>
              <th className="py-3 px-4 w-28 text-right border-r border-slate-200/70">방문객 수</th>
              <th className="py-3 px-4 w-32 text-right">1인당 객단가</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {spannedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  집계된 Matrix 실측 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              spannedRows.map((row, idx) => {
                const isGrand = !!row.isGrandTotal;
                const isSub = !!row.isSubtotal && !isGrand;

                if (isGrand) {
                  return (
                    <tr key={idx} className="bg-blue-50/90 font-extrabold text-blue-950 border-t-2 border-b-2 border-blue-200">
                      <td colSpan={4} className="py-3 px-4 text-center border-r border-blue-200 tracking-wider">
                        👑 {row.division || row.ticketGroup || '전사 총합계 (GRAND TOTAL)'}
                      </td>
                      <td className="py-3 px-4 text-right border-r border-blue-200 text-sm font-extrabold tabular-nums text-blue-900">
                        {formatNumber(row.netAmount)}
                      </td>
                      <td className="py-3 px-4 text-right border-r border-blue-200 tabular-nums">
                        {row.visitors !== undefined && row.visitors > 0 ? formatNumber(row.visitors) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {row.spendPerGuest !== undefined && row.spendPerGuest > 0 ? formatNumber(row.spendPerGuest) : '-'}
                      </td>
                    </tr>
                  );
                }

                if (isSub) {
                  return (
                    <tr key={idx} className="bg-slate-100/90 font-bold text-slate-900 border-t border-b border-slate-200">
                      <td colSpan={4} className="py-2.5 px-4 text-right pr-6 border-r border-slate-200">
                        ↳ [{row.department || row.division || '소계'}] 소계
                      </td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200 font-bold tabular-nums text-slate-900">
                        {formatNumber(row.netAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200 tabular-nums text-slate-700">
                        {row.visitors !== undefined && row.visitors > 0 ? formatNumber(row.visitors) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">
                        {row.spendPerGuest !== undefined && row.spendPerGuest > 0 ? formatNumber(row.spendPerGuest) : '-'}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                    {/* 1. 대분류 Rowspan Cell */}
                    {row.divisionSpan > 0 && (
                      <td
                        rowSpan={row.divisionSpan}
                        className="py-2.5 px-4 text-center font-bold text-slate-800 bg-slate-50/60 border-r border-slate-200/80 align-middle shadow-2xs"
                      >
                        {row.division}
                      </td>
                    )}

                    {/* 2. 중분류 (8대 부서) Rowspan Cell */}
                    {row.departmentSpan > 0 && (
                      <td
                        rowSpan={row.departmentSpan}
                        className="py-2.5 px-4 text-center font-semibold text-slate-800 bg-white border-r border-slate-200/80 align-middle"
                      >
                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-800 text-2xs font-bold border border-slate-200">
                          {row.department}
                        </span>
                      </td>
                    )}

                    {/* 3. 영업장 (Facility) Rowspan Cell */}
                    {row.venueSpan > 0 && (
                      <td
                        rowSpan={row.venueSpan}
                        className="py-2.5 px-4 text-center font-medium text-slate-700 bg-slate-50/30 border-r border-slate-200/80 align-middle"
                      >
                        {row.venue}
                      </td>
                    )}

                    {/* 4. 티켓그룹 / 채널구분 */}
                    <td className="py-2.5 px-4 border-r border-slate-200/80 font-normal text-slate-600">
                      {row.ticketGroup}
                    </td>

                    {/* 5. 실측 매출액 (#,##0) */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200/80 font-bold tabular-nums text-slate-900">
                      {formatNumber(row.netAmount)}
                    </td>

                    {/* 6. 방문객 수 */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200/80 tabular-nums text-slate-600">
                      {row.visitors !== undefined && row.visitors > 0 ? formatNumber(row.visitors) : '-'}
                    </td>

                    {/* 7. 1인당 객단가 */}
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">
                      {row.spendPerGuest !== undefined && row.spendPerGuest > 0 ? formatNumber(row.spendPerGuest) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
