"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  BarChart3, 
  DollarSign, 
  Users, 
  TrendingUp, 
  ArrowUpDown, 
  Layers, 
  Search, 
  Filter,
  Loader2,
  Calendar
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { formatNumber, formatPercent } from '@/lib/formatters';

interface VenueDetail {
  venueName: string;
  partName: string;
  revenue: number;
  visitorCount: number;
  spendPerGuest: number;
}

export default function VenueAnalyticsPage() {
  const { startDate, endDate, isMounted } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueDetail[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'revenue' | 'visitorCount' | 'spendPerGuest'>('revenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    if (!isMounted) return;

    let ignore = false;
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();
        if (ignore) return;

        if (json.success && json.gridRows) {
          const map: Record<string, VenueDetail> = {};
          json.gridRows.forEach((r: any) => {
            const key = `${r.partName}__${r.venueName}`;
            if (!map[key]) {
              map[key] = {
                venueName: r.venueName,
                partName: r.partName,
                revenue: 0,
                visitorCount: 0,
                spendPerGuest: 0,
              };
            }
            map[key].revenue += r.revenue;
            map[key].visitorCount += r.visitorCount;
          });

          const list = Object.values(map).map((v) => ({
            ...v,
            spendPerGuest: v.visitorCount > 0 ? Math.round(v.revenue / v.visitorCount) : 0,
          }));

          setVenues(list);
        }
      } catch (err) {
        console.error('Failed to load venue analytics:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchVenues();
    return () => { ignore = true; };
  }, [startDate, endDate, isMounted]);

  const totalRevenue = useMemo(() => venues.reduce((sum, v) => sum + v.revenue, 0), [venues]);
  const totalVisitors = useMemo(() => venues.reduce((sum, v) => sum + v.visitorCount, 0), [venues]);
  const avgSpend = totalVisitors > 0 ? Math.round(totalRevenue / totalVisitors) : 0;

  // 필터링 및 정렬
  const filteredVenues = useMemo(() => {
    return venues
      .filter((v) => {
        const matchesPart = selectedPart === 'ALL' || v.partName === selectedPart;
        const matchesSearch = v.venueName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesPart && matchesSearch;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [venues, selectedPart, searchTerm, sortField, sortOrder]);

  const handleSort = (field: 'revenue' | 'visitorCount' | 'spendPerGuest') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const parts = ['ALL', '액티비티', '목장', '마리나', '미디어아트', '모토아레나'];

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <span className="text-xs font-semibold text-slate-500">영업장별 실적 및 객단가 데이터 집계 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-emerald-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              영업장별 심층 분석 (순매출 · 방문객 · 객단가)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            레저본부 14개 세부 영업장별 매출 기여도 및 1인당 평균 소비액(ARPA)을 비교 분석합니다.
          </p>
        </div>

        <GlobalDateSelector />
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">레저 전체 매출</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatNumber(totalRevenue)}
          </div>
          <p className="text-2xs text-slate-500">조회 기간 영업장 합계</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 레저 이용객</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatNumber(totalVisitors)} <span className="text-xs font-normal text-slate-500">명</span>
          </div>
          <p className="text-2xs text-slate-500">전 영업장 누적 방문</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">평균 객단가 (ARPA)</span>
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600">
            {formatNumber(avgSpend)}
          </div>
          <p className="text-2xs text-slate-500">1인당 평균 소비 금액</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Part Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {parts.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPart(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPart === p
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'ALL' ? '전체 파트' : p}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-64">
          <Search size={14} className="text-slate-400" />
          <input 
            type="text"
            placeholder="영업장명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-slate-800 outline-none w-full"
          />
        </div>
      </div>

      {/* Venues Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 border-r border-slate-200 w-12 text-center">순위</th>
                <th className="py-3 px-4 border-r border-slate-200">영업장명</th>
                <th className="py-3 px-4 border-r border-slate-200 w-32">소속 레저 파트</th>
                <th 
                  onClick={() => handleSort('revenue')}
                  className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>순매출</span>
                    <ArrowUpDown size={12} className={sortField === 'revenue' ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('visitorCount')}
                  className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>이용객 수</span>
                    <ArrowUpDown size={12} className={sortField === 'visitorCount' ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('spendPerGuest')}
                  className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>객단가 (ARPA)</span>
                    <ArrowUpDown size={12} className={sortField === 'spendPerGuest' ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                </th>
                <th className="py-3 px-4 text-right w-24">매출 비중</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVenues.map((v, idx) => {
                const revShare = totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors font-medium">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                      {v.venueName}
                    </td>
                    <td className="py-3.5 px-4 border-r border-slate-200">
                      <span className="px-2.5 py-1 rounded-md text-2xs font-semibold bg-slate-100 text-slate-700">
                        {v.partName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                      {formatNumber(v.revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 border-r border-slate-200">
                      {formatNumber(v.visitorCount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                      {formatNumber(v.spendPerGuest)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-2xs font-semibold text-slate-500">
                      {formatPercent(revShare, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
