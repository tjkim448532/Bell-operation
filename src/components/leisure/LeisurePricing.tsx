"use client";

import { useState, useMemo, useEffect } from 'react';
import { secureFetcher } from '@/lib/secureFetcher';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Tag,
  Percent,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Ticket,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Flag,
  Hotel,
  Utensils,
  MapPin,
  Calendar,
  Flame
} from 'lucide-react';
import {
  LEISURE_FACILITIES,
  MAIN_CATEGORY_TABS,
  type MainCategoryType,
  type LeisureFacilityPricing
} from '@/data/leisurePricingData';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export default function LeisurePricing() {
  const [selectedCategory, setSelectedCategory] = useState<MainCategoryType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscountFilter, setSelectedDiscountFilter] = useState<string>('all');
  const [onlySpecialOffers, setOnlySpecialOffers] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [facilities, setFacilities] = useState<LeisureFacilityPricing[]>(LEISURE_FACILITIES);
  const [lastUpdated, setLastUpdated] = useState<string>('2026-10-17 (공식 실측 SSOT)');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Fetch nightly S3 snapshot via backend API when available
  useEffect(() => {
    let isCancelled = false;
    const fetchLatestCatalog = async () => {
      try {
        setIsSyncing(true);
        const res = await secureFetcher(`${API_BASE}/api/v6/leisure/pricing-catalog`).catch(() => null);
        if (isCancelled || !res) return;
        const payload = res?.data ?? res;
        if (payload?.lastUpdated) {
          setLastUpdated(`${payload.lastUpdated.replace('T', ' ').substring(0, 16)} (S3 실시간 동기화)`);
        }
        if (payload?.facilities && Array.isArray(payload.facilities) && payload.facilities.length > 0) {
          setFacilities(payload.facilities);
        } else if (payload?.specialOffers && Array.isArray(payload.specialOffers)) {
          // Merge dynamic S3 special offers and golf snapshot with static SSOT
          setFacilities((prev) => {
            return prev.map((facility) => {
              // Update special offers dynamically
              if (facility.isSpecialOffer) {
                const matchedOffer = payload.specialOffers.find((so: any) =>
                  so.id === facility.id.replace('offer-', '') ||
                  facility.name.includes(so.title) ||
                  so.title.includes(facility.name.replace('[스페셜 오퍼]', '').trim())
                );
                if (matchedOffer) {
                  return {
                    ...facility,
                    period: matchedOffer.period || facility.period,
                    officialUrl: matchedOffer.link || facility.officialUrl,
                    summary: matchedOffer.desc || facility.summary
                  };
                }
              }
              // Update golf snapshot dynamically
              if (facility.id === 'golf-greenfee' && payload.golfSnapshot?.verified) {
                return {
                  ...facility,
                  regularPrices: facility.regularPrices.map(rp => {
                    if (rp.name.includes('주중') && payload.golfSnapshot.greenFeeWeekday) {
                      return { ...rp, priceWeekday: payload.golfSnapshot.greenFeeWeekday };
                    }
                    if (rp.name.includes('주말') && payload.golfSnapshot.greenFeeWeekend) {
                      return { ...rp, priceWeekend: payload.golfSnapshot.greenFeeWeekend };
                    }
                    if (rp.name.includes('카트') && payload.golfSnapshot.cartFee) {
                      return { ...rp, priceWeekday: payload.golfSnapshot.cartFee, priceWeekend: payload.golfSnapshot.cartFee };
                    }
                    return rp;
                  })
                };
              }
              return facility;
            });
          });
        }
      } finally {
        if (!isCancelled) setIsSyncing(false);
      }
    };

    fetchLatestCatalog();
    return () => { isCancelled = true; };
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: facilities.length, golf: 0, room: 0, leisure: 0, dining: 0 };
    facilities.forEach(f => {
      if (counts[f.mainCategory] !== undefined) {
        counts[f.mainCategory]++;
      }
    });
    return counts;
  }, [facilities]);

  // Quick Discount Filter Badges
  const discountFilterTags = [
    { key: 'all', label: '전체' },
    { key: 'resident', label: '충북도민/증평군민 우대' },
    { key: 'hotel', label: '콘도 투숙객 할인' },
    { key: 'member', label: '분양회원 우대' },
    { key: 'free', label: '36개월 미만 무료' },
  ];

  // Filtering Logic
  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      // 1. Main Category filter
      if (selectedCategory !== 'all' && facility.mainCategory !== selectedCategory) {
        return false;
      }

      // 2. Special offer filter
      if (onlySpecialOffers && !facility.isSpecialOffer) {
        return false;
      }

      // 3. Discount tag filter
      if (selectedDiscountFilter === 'resident') {
        const hasResident = facility.discounts.some(d => d.target.includes('도민') || d.target.includes('군민')) ||
                            facility.discountBadges.some(b => b.includes('도민') || b.includes('군민'));
        if (!hasResident) return false;
      } else if (selectedDiscountFilter === 'hotel') {
        const hasHotel = facility.discounts.some(d => d.target.includes('숙박') || d.target.includes('투숙')) ||
                         facility.discountBadges.some(b => b.includes('숙박') || b.includes('투숙'));
        if (!hasHotel) return false;
      } else if (selectedDiscountFilter === 'member') {
        const hasMember = facility.discounts.some(d => d.target.includes('회원')) ||
                          facility.discountBadges.some(b => b.includes('회원'));
        if (!hasMember) return false;
      } else if (selectedDiscountFilter === 'free') {
        const hasFree = facility.discounts.some(d => d.target.includes('무료') || d.rate.includes('무료')) ||
                        facility.regularPrices.some(p => p.priceWeekday === '무료') ||
                        facility.discountBadges.some(b => b.includes('무료'));
        if (!hasFree) return false;
      }

      // 4. Keyword Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = facility.name.toLowerCase().includes(q);
        const matchSummary = facility.summary.toLowerCase().includes(q);
        const matchPrices = facility.regularPrices.some(p => p.name.toLowerCase().includes(q) || p.note?.toLowerCase().includes(q) || p.priceWeekday.toLowerCase().includes(q));
        const matchDiscounts = facility.discounts.some(d => d.target.toLowerCase().includes(q) || d.condition.toLowerCase().includes(q));
        const matchBadges = facility.discountBadges.some(b => b.toLowerCase().includes(q));
        const matchCategory = facility.mainCategoryLabel.toLowerCase().includes(q) || (facility.subCategory && facility.subCategory.toLowerCase().includes(q));
        return matchName || matchSummary || matchPrices || matchDiscounts || matchBadges || matchCategory;
      }

      return true;
    });
  }, [facilities, selectedCategory, onlySpecialOffers, selectedDiscountFilter, searchTerm]);

  // Expand / Collapse Handlers
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredFacilities.map(f => f.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const getCategoryColor = (cat: MainCategoryType) => {
    switch (cat) {
      case 'golf':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          activeTab: 'bg-emerald-600 text-white shadow-emerald-200'
        };
      case 'room':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          activeTab: 'bg-blue-600 text-white shadow-blue-200'
        };
      case 'leisure':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          activeTab: 'bg-purple-600 text-white shadow-purple-200'
        };
      case 'dining':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          activeTab: 'bg-amber-600 text-white shadow-amber-200'
        };
    }
  };

  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'golf': return <Flag size={18} />;
      case 'room': return <Hotel size={18} />;
      case 'leisure': return <Ticket size={18} />;
      case 'dining': return <Utensils size={18} />;
      default: return <Sparkles size={18} />;
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto p-8 space-y-6 pb-16">
      {/* 1. Header Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                벨포레 통합 이용요금 안내
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                S3 자동 동기화
                {isSyncing && <RefreshCw size={11} className="animate-spin text-blue-600" />}
              </span>
              <span className="text-xs text-slate-400">기준: {lastUpdated}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              시설·패키지 종합 이용요금 및 혜택 안내
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              골프, 객실, 레져, 식음 4대 전 부문의 정상 요금, 우대 할인, 세부 구성 및 스페셜 오퍼를 일목요연하게 제공합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} />
                <span>카드형</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TableIcon size={14} />
                <span>표 형식</span>
              </button>
            </div>

            {/* Expand / Collapse All */}
            {viewMode === 'card' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={expandAll}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors"
                  title="전체 상세 펼치기"
                >
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">모두 펼치기</span>
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors"
                  title="전체 상세 접기"
                >
                  <Minimize2 size={13} />
                  <span className="hidden sm:inline">모두 접기</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. 4대 메인 카테고리 탭 (골프 | 객실 | 레져 | 식음) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {MAIN_CATEGORY_TABS.map((tab) => {
              const isSelected = selectedCategory === tab.key;
              const count = categoryCounts[tab.key as keyof typeof categoryCounts] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key as MainCategoryType | 'all')}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? tab.key === 'golf'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : tab.key === 'room'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : tab.key === 'leisure'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : tab.key === 'dining'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(tab.key)}
                    <span>{tab.label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 검색창 및 특가/우대 빠른 필터 바 */}
        <div className="mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="시설명, 메뉴, 요금(예: 30,000원, 그린피), 키제한 등 검색..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Special Offer Toggle Button */}
            <button
              onClick={() => setOnlySpecialOffers(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                onlySpecialOffers
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Flame size={13} className={onlySpecialOffers ? 'text-white' : 'text-rose-600'} />
              <span>스페셜 오퍼(패키지)만</span>
            </button>

            {discountFilterTags.map((tag) => (
              <button
                key={tag.key}
                onClick={() => setSelectedDiscountFilter(tag.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  selectedDiscountFilter === tag.key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results summary bar */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            총 <strong className="text-slate-900 font-bold">{filteredFacilities.length}개</strong>의 항목이 조회되었습니다.
            {selectedCategory !== 'all' && (
              <span className="ml-1 text-slate-400">
                (카테고리: {MAIN_CATEGORY_TABS.find(t => t.key === selectedCategory)?.label})
              </span>
            )}
          </span>
          <span className="text-slate-400">카드 항목을 클릭하면 우대할인 및 상세 정보가 펼쳐집니다.</span>
        </div>
      </div>

      {/* 4. Main Content: Card View or Table View */}
      {filteredFacilities.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <AlertCircle size={40} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">일치하는 이용요금 정보가 없습니다</h3>
          <p className="text-xs text-slate-500">
            검색어 또는 필터 조건을 변경하여 다시 검색해 보세요.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedDiscountFilter('all');
              setOnlySpecialOffers(false);
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            전체 초기화
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFacilities.map((facility) => {
            const isExpanded = expandedIds.has(facility.id);
            const catColor = getCategoryColor(facility.mainCategory);

            return (
              <div
                key={facility.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-slate-400 shadow-md ring-1 ring-slate-300'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Card Header (Always Visible & Clickable) */}
                <div
                  onClick={() => toggleExpand(facility.id)}
                  className="p-5 cursor-pointer select-none space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Main Category Badge */}
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${catColor.badge}`}>
                          {facility.mainCategoryLabel}
                        </span>

                        {facility.subCategory && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {facility.subCategory}
                          </span>
                        )}

                        {facility.isSpecialOffer && (
                          <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                            <Flame size={12} />
                            SPECIAL OFFER
                          </span>
                        )}

                        {facility.closedDay && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            {facility.closedDay}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {facility.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title={isExpanded ? '상세 접기' : '상세 펼치기'}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {facility.summary}
                  </p>

                  {/* Representative Price Box */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold text-slate-500">대표 요금</span>
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      {facility.representativePrice}
                    </span>
                  </div>

                  {/* Discount Badges */}
                  {facility.discountBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {facility.discountBadges.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                        >
                          <Tag size={10} className="text-slate-400" />
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Period or Operating Hours Preview */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    {facility.period ? (
                      <div className="flex items-center gap-1 text-rose-600 font-semibold">
                        <Calendar size={13} />
                        <span>기간: {facility.period}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        <span>{facility.operatingHours}</span>
                      </div>
                    )}
                    {facility.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{facility.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Expandable Details (Shown on Click) */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-5 space-y-5 animate-in fade-in duration-200">
                    {/* A. Regular Price Table */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        정규 요금표 (공식 실측 기준)
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 text-left">구분 / 품목명</th>
                              <th className="py-2.5 px-3 text-right">주중 요금</th>
                              <th className="py-2.5 px-3 text-right">주말/공휴일 요금</th>
                              <th className="py-2.5 px-3 text-left">비고 및 포함내역</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {facility.regularPrices.map((price, pIdx) => (
                              <tr key={pIdx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {price.name}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                  {price.priceWeekday}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                  {price.priceWeekend || price.priceWeekday}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {price.note || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* B. Discount Policy Table (If Available) */}
                    {facility.discounts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                          <Percent size={14} className="text-blue-600" />
                          우대 및 할인 혜택
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-blue-100 bg-blue-50/30">
                          <table className="w-full text-xs">
                            <thead className="bg-blue-100/60 text-blue-900 font-bold border-b border-blue-100">
                              <tr>
                                <th className="py-2 px-3 text-left">우대 대상</th>
                                <th className="py-2 px-3 text-center">할인율 / 혜택</th>
                                <th className="py-2 px-3 text-right">할인 적용가</th>
                                <th className="py-2 px-3 text-left">증빙 및 적용 조건</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100/60">
                              {facility.discounts.map((disc, dIdx) => (
                                <tr key={dIdx} className="hover:bg-blue-50/60 transition-colors">
                                  <td className="py-2 px-3 font-semibold text-blue-950">
                                    {disc.target}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-blue-200/80 text-blue-900">
                                      {disc.rate}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-blue-950 whitespace-nowrap">
                                    {disc.discountPrice || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-blue-800">
                                    {disc.condition}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* C. Requirements & Operational Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {facility.requirements.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            이용 조건 및 준수사항
                          </h5>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {facility.requirements.map((req, rIdx) => (
                              <li key={rIdx}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {facility.notes.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <AlertCircle size={14} className="text-slate-500" />
                            시설 특전 및 유의사항
                          </h5>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {facility.notes.map((note, nIdx) => (
                              <li key={nIdx}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* D. Additional Meta & Official Booking Link */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-200">
                      <div className="flex flex-wrap items-center gap-3">
                        {facility.contact && (
                          <div className="flex items-center gap-1 font-medium">
                            <Phone size={13} className="text-slate-400" />
                            <span>문의: {facility.contact}</span>
                          </div>
                        )}
                        {facility.breakTime && (
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>정비시간: {facility.breakTime}</span>
                          </div>
                        )}
                      </div>

                      {facility.officialUrl && (
                        <a
                          href={facility.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <span>공식 홈페이지 안내/예약</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (전체 비교용 콤팩트 테이블) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left">분류</th>
                  <th className="py-3 px-4 text-left">시설/상품명</th>
                  <th className="py-3 px-4 text-left">대표 요금</th>
                  <th className="py-3 px-4 text-left">운영시간 / 기간</th>
                  <th className="py-3 px-4 text-left">우대 및 할인 혜택</th>
                  <th className="py-3 px-4 text-center">상세보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacilities.map((facility) => {
                  const isExpanded = expandedIds.has(facility.id);
                  const catColor = getCategoryColor(facility.mainCategory);

                  return (
                    <tr key={facility.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${catColor.badge}`}>
                          {facility.mainCategoryLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{facility.name}</span>
                          {facility.isSpecialOffer && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-500 text-white">
                              HOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">
                          {facility.summary}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {facility.representativePrice}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {facility.period || facility.operatingHours}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {facility.discountBadges.slice(0, 2).map((b, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 border border-slate-200">
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setViewMode('card');
                            toggleExpand(facility.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          {isExpanded ? '접기' : '펼치기'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
