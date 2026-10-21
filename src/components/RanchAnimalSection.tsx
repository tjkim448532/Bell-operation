"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExternalLink, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  LayoutGrid, 
  Table as TableIcon,
  CheckCircle2,
  Sparkles,
  HeartPulse,
  UserCheck,
  Clock,
  CalendarDays
} from 'lucide-react';

export interface RanchAnimal {
  no: string;
  species: string;
  name: string;
  gender: string;
  age: string;
  admissionDate: string;
  source: string;
  healthStatus: string;
  vaccination: string;
  specialNotes: string;
  keeper: string;
  photo: string;
  notes: string;
  categoryGroup: string;
  categoryIcon: string;
}

interface RanchAnimalStats {
  totalEntries: number;
  totalSpecies: number;
  healthyCount: number;
  borderCollieCount: number;
  horseCount: number;
  groupCounts: Record<string, number>;
}

const CATEGORY_TABS = [
  { id: 'ALL', label: '전체 보기', icon: '🐾' },
  { id: '포니 / 승용마', label: '포니 · 승용마', icon: '🐴' },
  { id: '초식 / 가축', label: '초식 · 가축', icon: '🐑' },
  { id: '조류 / 앵무새', label: '조류 · 앵무새', icon: '🦜' },
  { id: '양몰이견 (보더콜리)', label: '양몰이견 (보더콜리)', icon: '🐕' },
];

export default function RanchAnimalSection() {
  const [animals, setAnimals] = useState<RanchAnimal[]>([]);
  const [stats, setStats] = useState<RanchAnimalStats | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/1fnoiG8gTRqZJlMFZ_DLYX3Ac_ROgofXbWKbhEJVRkso/edit?usp=sharing');
  const [lastSync, setLastSync] = useState<string>('');
  const [sheetLastModified, setSheetLastModified] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 필터 및 검색 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [onlyHealthy, setOnlyHealthy] = useState<boolean>(false);

  const fetchRanchAnimals = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ranch/animals', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`데이터를 불러오지 못했습니다. (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '구글 시트 동기화 실패');
      }

      setAnimals(data.animals || []);
      setStats(data.stats || null);
      if (data.sheetUrl) setSheetUrl(data.sheetUrl);
      setLastSync(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (data.sheetLastModified) {
        const modDate = new Date(data.sheetLastModified);
        setSheetLastModified(modDate.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }));
      }
    } catch (err: any) {
      console.error('Failed to load ranch animals:', err);
      setError(err?.message || '구글 스프레드시트 동기화 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRanchAnimals();
  }, []);

  // 필터링된 동물 리스트
  const filteredAnimals = useMemo(() => {
    return animals.filter((animal) => {
      // 카테고리 필터
      if (selectedCategory !== 'ALL' && animal.categoryGroup !== selectedCategory) {
        return false;
      }
      // 건강 양호 필터
      if (onlyHealthy && !animal.healthStatus.includes('양호')) {
        return false;
      }
      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = animal.name.toLowerCase().includes(q);
        const matchSpecies = animal.species.toLowerCase().includes(q);
        const matchKeeper = animal.keeper.toLowerCase().includes(q);
        const matchNotes = animal.specialNotes.toLowerCase().includes(q);
        const matchGender = animal.gender.toLowerCase().includes(q);
        if (!matchName && !matchSpecies && !matchKeeper && !matchNotes && !matchGender) {
          return false;
        }
      }
      return true;
    });
  }, [animals, selectedCategory, onlyHealthy, searchQuery]);

  return (
    <div id="ranch-animals" className="bg-white rounded-2xl xl:rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 xl:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-black bg-emerald-400 text-slate-950 flex items-center gap-1 shadow-xs">
                🐑 벨포레 목장 전용
              </span>
              <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-white/15 text-white flex items-center gap-1 border border-white/20">
                <CheckCircle2 size={11} className="text-emerald-300" />
                구글 스프레드시트 실시간 동기화
              </span>
              {sheetLastModified && (
                <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <span>🕒 시트 최종 변경:</span>
                  <span className="font-mono text-white">{sheetLastModified}</span>
                </span>
              )}
              {lastSync && (
                <span className="text-3xs text-slate-300 font-medium">
                  (동기화 확인: {lastSync})
                </span>
              )}
            </div>
            <h2 className="text-xl xl:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>벨포레 목장 동물 관리 대장</span>
              <span className="text-xs xl:text-sm font-semibold text-emerald-200/80 bg-white/10 px-2.5 py-0.5 rounded-lg">
                총 {stats ? stats.totalEntries : animals.length}개체군 관리 중
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              현장 사육사 및 담당자가 구글 스프레드시트에 작성·수정한 내용이 이 화면에 100% 실시간 반영됩니다.
            </p>

            {/* 구글 시트 최종 업데이트 & 변경 시점 강조 배너 */}
            <div className="mt-3.5 inline-flex flex-wrap items-center gap-3 bg-emerald-950/80 border border-emerald-400/40 px-3.5 py-2.5 rounded-2xl backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Clock size={15} />
                </div>
                <div>
                  <span className="text-3xs text-emerald-300 font-bold block uppercase tracking-wider">
                    구글 시트 최종 업데이트 (데이터 변경 시점)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs xl:text-sm font-black text-white font-mono tracking-tight">
                      {sheetLastModified ? `📅 ${sheetLastModified}` : '실시간 시트 확인 중...'}
                    </span>
                    <span className="text-3xs text-emerald-300/80 font-medium">
                      (동기화 점검: {lastSync || '확인 중'})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchRanchAnimals(true)}
              disabled={isRefreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? '동기화 중...' : '실시간 새로고침'}</span>
            </button>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 shadow-xs cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>원본 구글 시트 열기 ↗</span>
            </a>
          </div>
        </div>

        {/* 2. Top Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <span className="text-3xs font-semibold text-emerald-200 uppercase tracking-wider block">총 관리 동물 개체군</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl xl:text-2xl font-black text-white">{stats.totalEntries}</span>
                <span className="text-2xs text-slate-300 font-bold">개체군 ({stats.totalSpecies}종)</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <span className="text-3xs font-semibold text-emerald-200 uppercase tracking-wider block">양몰이견 (보더콜리)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl xl:text-2xl font-black text-white">{stats.borderCollieCount}</span>
                <span className="text-2xs text-slate-300 font-bold">두 (공연 및 목장 전담)</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <span className="text-3xs font-semibold text-emerald-200 uppercase tracking-wider block">포니 및 승용마</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl xl:text-2xl font-black text-white">{stats.horseCount}</span>
                <span className="text-2xs text-slate-300 font-bold">두 (체험 및 관리마)</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <span className="text-3xs font-semibold text-emerald-200 uppercase tracking-wider block">건강 상태 양호</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl xl:text-2xl font-black text-emerald-300">{stats.healthyCount}</span>
                <span className="text-2xs text-slate-300 font-bold">건 확인됨</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="p-4 xl:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            const count = tab.id === 'ALL' 
              ? animals.length 
              : (stats?.groupCounts[tab.id] ?? animals.filter(a => a.categoryGroup === tab.id).length);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#00AE95] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-3xs px-1.5 py-0.2 rounded-md font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & View Mode Switch */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Healthy Only Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyHealthy(!onlyHealthy)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              onlyHealthy 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-3xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <HeartPulse size={13} className={onlyHealthy ? 'text-emerald-600' : 'text-slate-400'} />
            <span>건강양호만</span>
          </button>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="동물 이름, 종류, 사육사, 특이사항 검색..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00AE95]/20 focus:border-[#00AE95] transition-all"
            />
          </div>

          {/* Card / Table View Switch */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              title="카드 뷰"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'card' ? 'bg-white text-[#00AE95] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="테이블 뷰"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#00AE95] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Content Area */}
      <div className="p-5 xl:p-7">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#00AE95] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">구글 스프레드시트에서 목장 동물 데이터를 실시간 동기화하고 있습니다...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
            <AlertCircle size={24} className="text-rose-600 mx-auto" />
            <h4 className="text-sm font-bold text-rose-800">구글 시트 동기화 실패</h4>
            <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchRanchAnimals(true)}
              className="mt-2 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : filteredAnimals.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-slate-400">
            <p className="text-sm font-bold text-slate-600">조건에 맞는 동물 정보가 없습니다.</p>
            <p className="text-xs">검색어 또는 카테고리 필터를 변경해 보세요.</p>
            {(searchQuery || selectedCategory !== 'ALL' || onlyHealthy) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setOnlyHealthy(false);
                }}
                className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          /* Card View (도감 프로필 뷰) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAnimals.map((animal) => {
              const isDeceased = animal.specialNotes?.includes('폐사') || animal.notes?.includes('폐사');
              return (
                <div
                  key={`${animal.no}-${animal.species}-${animal.name}`}
                  className={`rounded-2xl p-4.5 border transition-all duration-200 flex flex-col justify-between ${
                    isDeceased 
                      ? 'bg-slate-50/70 border-slate-200 opacity-60' 
                      : 'bg-white border-slate-200 hover:border-[#00AE95]/50 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Top Row: Category Icon + Species Badge + No */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base">{animal.categoryIcon}</span>
                        <span className="text-3xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate">
                          {animal.species}
                        </span>
                      </div>
                      <span className="text-3xs font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                        No. {animal.no}
                      </span>
                    </div>

                    {/* Animal Name & Main Badge */}
                    <div className="flex items-baseline gap-2 mb-2.5">
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {animal.name ? animal.name : `${animal.species} (${animal.gender || '개체군'})`}
                      </h3>
                      {animal.gender && animal.name && (
                        <span className={`text-3xs px-1.5 py-0.5 rounded font-bold ${
                          animal.gender.includes('수컷')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : animal.gender.includes('암컷')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {animal.gender}
                        </span>
                      )}
                    </div>

                    {/* Attribute Tags */}
                    <div className="grid grid-cols-2 gap-2 text-2xs text-slate-600 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-3xs text-slate-400 block font-semibold">나이</span>
                        <span className="font-bold text-slate-800">{animal.age || '-'}</span>
                      </div>
                      <div>
                        <span className="text-3xs text-slate-400 block font-semibold">건강 상태</span>
                        <span className={`font-bold inline-flex items-center gap-1 ${
                          animal.healthStatus.includes('양호') ? 'text-emerald-700' : 'text-slate-700'
                        }`}>
                          {animal.healthStatus.includes('양호') && <CheckCircle2 size={11} className="text-emerald-600" />}
                          {animal.healthStatus || '-'}
                        </span>
                      </div>
                      {animal.keeper && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-3xs text-slate-400 font-semibold">담당 사육사</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <UserCheck size={11} className="text-[#00AE95]" />
                            {animal.keeper}
                          </span>
                        </div>
                      )}
                      {animal.source && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-3xs text-slate-400 font-semibold">출처</span>
                          <span className="font-bold text-slate-700">{animal.source}</span>
                        </div>
                      )}
                    </div>

                    {/* Special Behavioral Notes / Remarks */}
                    {animal.specialNotes && (
                      <div className={`p-2.5 rounded-xl text-2xs mb-2 border ${
                        isDeceased
                          ? 'bg-rose-50/60 border-rose-200 text-rose-800'
                          : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                      }`}>
                        <div className="flex items-start gap-1.5">
                          <Sparkles size={12} className={`shrink-0 mt-0.5 ${isDeceased ? 'text-rose-500' : 'text-amber-600'}`} />
                          <span className="leading-relaxed font-medium">{animal.specialNotes}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer / Notes */}
                  {animal.notes && (
                    <div className="text-3xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-medium text-slate-400">비고</span>
                      <span className="font-semibold text-slate-600">{animal.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View (스프레드시트 원장 뷰) */
          <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-600 border-b border-slate-200 text-2xs font-extrabold uppercase">
                  <th className="py-2.5 px-3 w-14 text-center">No.</th>
                  <th className="py-2.5 px-3">동물 종류</th>
                  <th className="py-2.5 px-3">이름</th>
                  <th className="py-2.5 px-3">성별 / 두수</th>
                  <th className="py-2.5 px-3">나이</th>
                  <th className="py-2.5 px-3">건강 상태</th>
                  <th className="py-2.5 px-4">주요 특이사항 / 행동 특성</th>
                  <th className="py-2.5 px-3">사육사 담당자</th>
                  <th className="py-2.5 px-3">출처 / 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAnimals.map((animal) => {
                  const isDeceased = animal.specialNotes?.includes('폐사') || animal.notes?.includes('폐사');
                  return (
                    <tr 
                      key={`${animal.no}-${animal.species}-${animal.name}`}
                      className={`hover:bg-slate-50/80 transition-colors ${isDeceased ? 'bg-slate-50/40 text-slate-400' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                        {animal.no}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                          <span>{animal.categoryIcon}</span>
                          <span>{animal.species}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        {animal.name || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {animal.gender ? (
                          <span className={`text-3xs px-2 py-0.5 rounded-full font-bold inline-block ${
                            animal.gender.includes('수컷')
                              ? 'bg-blue-50 text-blue-700'
                              : animal.gender.includes('암컷')
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {animal.gender}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {animal.age || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 text-2xs font-bold ${
                          animal.healthStatus.includes('양호') ? 'text-emerald-700' : 'text-slate-600'
                        }`}>
                          {animal.healthStatus.includes('양호') && <CheckCircle2 size={11} className="text-emerald-600" />}
                          {animal.healthStatus || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 max-w-xs">
                        {animal.specialNotes ? (
                          <span className={`text-2xs font-medium ${isDeceased ? 'text-rose-600 font-bold' : ''}`}>
                            {animal.specialNotes}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {animal.keeper ? (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck size={11} className="text-[#00AE95]" />
                            {animal.keeper}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-2xs text-slate-500">
                        {[animal.source, animal.notes].filter(Boolean).join(' / ') || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
