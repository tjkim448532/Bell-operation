'use client';

import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';

interface RevenueSummary {
  totalRevenue: number;
  todayLyRevenue: number;
  todayGrowth: number;
  todayDiff: number;
  availableRooms: number;
  totalRooms: number;
  totalRoomCap: number;
  totalADR: number;
  totalOcc: number;
  revPAR: number;
  trevPar: number;
  totalGolfVisitors: number;
  golfGreenFeeRevenue: number;
}

interface CategorySales {
  categoryCode: string;
  revenue: number;
  weight: number;
}

interface V6SummaryResponse {
  success: boolean;
  vatPolicy: string;
  summary: RevenueSummary;
  salesByCategory: CategorySales[];
}

interface Ticket {
  ticketName: string;
  revenue: number;
}
interface Venue {
  venueName: string;
  tickets: Ticket[];
  venueSubtotal: number;
}
interface Division {
  orgDivision: string;
  venues: Venue[];
  divisionSubtotal: number;
}
interface V6OrgResponse {
  grandTotal: number;
  divisions: Division[];
}

const formatNum = (num: number) => new Intl.NumberFormat('ko-KR').format(num || 0);

export default function V6DashboardViewer() {
  const { startDate, endDate } = useDateFilter();
  const [summaryData, setSummaryData] = useState<V6SummaryResponse | null>(null);
  const [orgData, setOrgData] = useState<V6OrgResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sumRes, orgRes] = await Promise.all([
          fetch(`/api/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/v6/dashboard/revenue-by-org?startDate=${startDate}&endDate=${endDate}`)
        ]);

        if (!sumRes.ok) throw new Error(`HTTP 통신 에러: ${sumRes.status}`);
        if (!orgRes.ok) {
           const orgErrorText = await orgRes.text();
           throw new Error(`조직도 API 에러: ${orgRes.status} - ${orgErrorText}`);
        }
        
        const sumJson = await sumRes.json();
        const orgJson = await orgRes.json();
        
        // Zero-Proxy: 에러나면 즉시 throw
        if (sumJson.success === false) {
           throw new Error(sumJson.error || '백엔드 서버 장애 발생');
        }
        if (orgJson.success === false) {
           throw new Error(orgJson.error || '조직도 데이터 장애 발생');
        }
        
        setSummaryData(sumJson.data || sumJson);
        setOrgData(orgJson.data || orgJson);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [startDate, endDate]);

  if (loading) return <div className="p-4 font-bold text-gray-700">V6 0-Variance 엔진 데이터 동기화 중...</div>;
  if (error) return <div className="p-4 text-red-600 font-bold bg-red-50 border-l-4 border-red-500">🚨 API Server Error: {error}</div>;
  if (!summaryData || !summaryData.summary) return <div className="p-4 font-bold text-gray-700">조회된 데이터가 없습니다. (매출 0원)</div>;

  const { summary, vatPolicy } = summaryData;

  return (
    <div className="w-full p-4 bg-white shadow-md rounded-lg space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">통합 매출 요약 (V6 SSOT)</h2>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{vatPolicy || 'NET (VAT 10% 별도)'}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">전사 총매출</p>
          <p className="text-2xl font-bold text-gray-900">{formatNum(summary.totalRevenue)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">전년 동기 대비</p>
          <p className="text-xl font-semibold text-gray-700">{formatNum(summary.todayLyRevenue)}</p>
          <p className={`text-sm font-bold ${summary.todayGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {summary.todayGrowth >= 0 ? '+' : ''}{summary.todayGrowth}% ({formatNum(summary.todayDiff)})
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">객실 TrevPAR (가용 {summary.availableRooms || 175}실 기준)</p>
          <p className="text-2xl font-bold text-purple-700">{formatNum(summary.trevPar)}</p>
          <p className="text-xs text-gray-500 mt-1">ADR: {formatNum(summary.totalADR)} | Occ: {summary.totalOcc}%</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">골프 내장객 및 그린피</p>
          <p className="text-xl font-bold text-emerald-700">{formatNum(summary.golfGreenFeeRevenue)}</p>
          <p className="text-sm text-gray-600 mt-1">{formatNum(summary.totalGolfVisitors)} 명</p>
        </div>
      </div>

      {/* 8대 부서 계층형 테이블 (revenue-by-org) */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">8대 부서 계층별 매출 매트릭스 (Zero-Calculation)</h3>
        {orgData && orgData.divisions ? (
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 font-bold text-gray-700">대분류 (경영본부)</th>
                <th className="border p-2 font-bold text-gray-700">영업장 (표준명)</th>
                <th className="border p-2 font-bold text-gray-700">티켓그룹</th>
                <th className="border p-2 font-bold text-right text-gray-700">매출액</th>
              </tr>
            </thead>
            <tbody>
              {orgData.divisions.map((division, divIdx) => {
                const divisionRowSpan = division.venues.reduce((acc, v) => acc + (v.tickets?.length || 1), 0) + 1;

                return (
                  <React.Fragment key={`div-${divIdx}`}>
                    {division.venues.map((venue, venueIdx) => {
                      const venueRowSpan = venue.tickets?.length || 1;
                      const renderTickets = venue.tickets && venue.tickets.length > 0 ? venue.tickets : [{ ticketName: '매출 없음', revenue: 0 }];

                      return renderTickets.map((ticket, ticketIdx) => (
                        <tr key={`div-${divIdx}-ven-${venueIdx}-tik-${ticketIdx}`} className="hover:bg-gray-50">
                          {venueIdx === 0 && ticketIdx === 0 && (
                            <td rowSpan={divisionRowSpan} className="border p-2 bg-gray-50 font-bold align-top text-gray-800">
                              {division.orgDivision}
                            </td>
                          )}
                          {ticketIdx === 0 && (
                            <td rowSpan={venueRowSpan} className="border p-2 font-medium align-top text-gray-700">
                              {venue.venueName}
                            </td>
                          )}
                          <td className="border p-2 text-gray-600">{ticket.ticketName}</td>
                          <td className="border p-2 text-right font-mono text-gray-900">{formatNum(ticket.revenue)}</td>
                        </tr>
                      ));
                    })}
                    <tr className="bg-blue-50 font-bold">
                      <td className="border p-2 text-gray-800" colSpan={2}>[{division.orgDivision}] 총계</td>
                      <td className="border p-2 text-right font-mono text-blue-700">{formatNum(division.divisionSubtotal)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
              <tr className="bg-gray-800 text-white font-bold text-lg">
                <td className="border p-3 text-center" colSpan={3}>전사 누적 총계</td>
                <td className="border p-3 text-right font-mono">{formatNum(orgData.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="p-4 border border-gray-300 rounded text-center text-gray-500">조직도 데이터 없음</div>
        )}
      </div>
    </div>
  );
}
