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
  Shield,
  Sparkles
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { formatNumber, formatPercent } from '@/lib/formatters';

interface VenueDetail {
  teamName?: string;
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
            const key = `${r.teamName || ''}__${r.partName}__${r.venueName}`;
            if (!map[key]) {
              map[key] = {
                teamName: r.teamName,
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

  // 백엔드 제공 실측 파트 목록 동적 추출 (임의 하드코딩 배제)
  const parts = useMemo(() => {
    return ['ALL', ...Array.from(new Set(venues.map((v) => v.partName))).filter(Boolean)];
  }, [venues]);

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

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={36} className="animate-spin text-[#00AE95]" />
        <span className="text-sm font-semibold text-slate-500 tracking-tight">영업장별 실적 및 객단가 데이터 집계 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Hero Section */}
      <div className="relative bg-[#00AE95] rounded-b-2xl text-white py-5 px-6 sm:px-10 -mx-6 -mt-6 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
              <span>레져본부</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              영업장별 실적 분석
            </h1>
            <p className="text-white/90 text-xs max-w-2xl leading-relaxed">
              레져본부 {venues.length}개 영업장별 매출 및 1인당 평균 객단가 현황
            </p>
          </div>

          <div className="shrink-0 self-start md:self-center">
            <GlobalDateSelector />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Revenue */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">레져 전체 매출</span>
              <div className="w-10 h-10 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-slate-900">
              {formatNumber(totalRevenue)}
            </div>
            <p className="text-xs text-slate-500 font-medium">조회 기간 영업장 합계</p>
          </div>

          {/* Visitors */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">총 레져 이용객</span>
              <div className="w-10 h-10 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <Users size={20} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-slate-900">
              {formatNumber(totalVisitors)} <span className="text-sm font-normal text-slate-500">명</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">전 영업장 누적 방문</p>
          </div>

          {/* ARPA */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">평균 객단가</span>
              <div className="w-10 h-10 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-[#00AE95]">
              {formatNumber(avgSpend)}
            </div>
            <p className="text-xs text-slate-500 font-medium">1인당 평균 소비 금액</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-5 rounded-[32px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Dynamic Part Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {parts.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPart(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPart === p
                    ? 'bg-[#00AE95] text-white shadow-[0_4px_12px_rgba(0,174,149,0.25)]'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {p === 'ALL' ? '전체 파트' : p}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 w-full sm:w-72 focus-within:border-[#00AE95] focus-within:bg-white transition-all">
            <Search size={15} className="text-slate-400" />
            <input 
              type="text"
              placeholder="영업장명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none w-full placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Venues Table */}
        <div className="rounded-[32px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5 border-r border-slate-200 w-14 text-center">순위</th>
                  <th className="py-3.5 px-5 border-r border-slate-200">영업장명</th>
                  <th className="py-3.5 px-5 border-r border-slate-200 w-32">소속 본부</th>
                  <th className="py-3.5 px-5 border-r border-slate-200 w-36">소속 파트</th>
                  <th 
                    onClick={() => handleSort('revenue')}
                    className="py-3.5 px-5 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>순매출</span>
                      <ArrowUpDown size={12} className={sortField === 'revenue' ? 'text-[#00AE95]' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('visitorCount')}
                    className="py-3.5 px-5 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>이용객 수</span>
                      <ArrowUpDown size={12} className={sortField === 'visitorCount' ? 'text-[#00AE95]' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('spendPerGuest')}
                    className="py-3.5 px-5 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>1인당 객단가</span>
                      <ArrowUpDown size={12} className={sortField === 'spendPerGuest' ? 'text-[#00AE95]' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-right w-28">매출 비중</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVenues.map((v, idx) => {
                  const revShare = totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors font-medium">
                      <td className="py-4 px-5 text-center font-mono text-slate-400 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900 border-r border-slate-200">
                        {v.venueName}
                      </td>
                      <td className="py-4 px-5 border-r border-slate-200">
                        <span className="px-2.5 py-1 rounded-md text-2xs font-semibold bg-slate-100 text-slate-700">
                          {v.teamName || '레져본부'}
                        </span>
                      </td>
                      <td className="py-4 px-5 border-r border-slate-200">
                        <span className="px-2.5 py-1 rounded-md text-2xs font-semibold bg-[#00AE95]/10 text-[#00AE95] border border-[#00AE95]/20">
                          {v.partName}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                        {formatNumber(v.revenue)}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-slate-700 border-r border-slate-200">
                        {formatNumber(v.visitorCount)}
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-[#00AE95] border-r border-slate-200">
                        {formatNumber(v.spendPerGuest)}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-xs font-semibold text-slate-500">
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
    </div>
  );
}
