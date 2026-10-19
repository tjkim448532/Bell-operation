"use client";

import { useState, useEffect, useMemo } from 'react';
import { useCoreData } from '@/contexts/CoreDataContext';
import { useDate } from '@/contexts/DateContext';
import { secureFetcher } from '@/lib/secureFetcher';
import { Ticket, Trophy, AlertCircle, Wallet, Award, Globe } from 'lucide-react';
import GlobalDatePicker from '@/components/GlobalDatePicker';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

const parseNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (val: any) => {
  if (!val) return '0';
  const num = parseNumber(val);
  return isNaN(num) ? '0' : new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

export interface TopTicketItem {
  rank?: number;
  itemName: string;
  facilityName?: string;
  sales: number;
  quantity: number;
  unitPrice?: number;
}

export default function LeisureFacility() {
  const { core, isLoading } = useCoreData();
  const { startDate, endDate, isRange } = useDate();

  const [apiTopItems, setApiTopItems] = useState<TopTicketItem[]>([]);

  const [isTopItemsLoading, setIsTopItemsLoading] = useState<boolean>(true);

  // Fetch item-level top tickets from backend API (excluding Moto Arena)
  useEffect(() => {
    let isCancelled = false;
    const fetchTopItems = async () => {
      setIsTopItemsLoading(true);
      try {
        const isRangeQuery = Boolean(endDate && startDate !== endDate);
        const queryParams = isRangeQuery
          ? `startDate=${startDate}&endDate=${endDate}&limit=30`
          : `date=${startDate}&limit=30`;
        const res = await secureFetcher(`${API_BASE}/api/v6/report/top-ticket-items?${queryParams}`).catch(() => null);
        if (isCancelled) return;
        const payload = res?.data ?? res;
        if (payload?.topItems && Array.isArray(payload.topItems) && payload.topItems.length > 0) {
          const filtered = payload.topItems
            .filter((item: any) => {
              const cat = String(item.categoryCode || '');
              return cat !== 'MOTO';
            })
            // 총액수(sales) 기준 내림차순 정렬
            .sort((a: any, b: any) => parseNumber(b.sales || b.totalSales || 0) - parseNumber(a.sales || a.totalSales || 0))
            .slice(0, 5);

          setApiTopItems(filtered.map((item: any, idx: number) => ({
            rank: idx + 1,
            itemName: item.itemName || item.name || '티켓 상품',
            facilityName: item.facilityName || item.shopName || '레저본부',
            sales: parseNumber(item.sales || item.totalSales || 0),
            quantity: parseNumber(item.quantity || item.qty || 0),
            unitPrice: parseNumber(item.unitPrice || 0)
          })));
        } else {
          setApiTopItems([]);
        }
      } catch {
        if (!isCancelled) setApiTopItems([]);
      } finally {
        if (!isCancelled) setIsTopItemsLoading(false);
      }
    };
    fetchTopItems();
    return () => {
      isCancelled = true;
    };
  }, [startDate, endDate, isRange]);

  // 레저본부 전체 영업장 판매채널(자사·OTA·POS·PMS) 비중 — 백엔드 완제품(summary, venues) 그대로 바인딩
  const [channelData, setChannelData] = useState<{ summary: any; venues: any[] } | null>(null);
  const [channelLoading, setChannelLoading] = useState<boolean>(true);
  const [channelError, setChannelError] = useState<string | null>(null);
  // [Ticket 34] 업장·권종별 정가 대비 할인 누수율 및 미사용 티켓 감사
  const [discountLeakageIntel, setDiscountLeakageIntel] = useState<any>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchChannels = async () => {
      setChannelLoading(true);
      setChannelError(null);
      try {
        const isRangeQuery = Boolean(endDate && startDate !== endDate);
        const queryParams = isRangeQuery
          ? `startDate=${startDate}&endDate=${endDate}`
          : `date=${startDate}`;
        const [res, discountRes] = await Promise.all([
          secureFetcher(`${API_BASE}/api/v6/report/leisure-channel-sales?${queryParams}`),
          secureFetcher(`${API_BASE}/api/v6/report/leisure-discount-leakage?${queryParams}`).catch(() => null)
        ]);
        if (isCancelled) return;
        if (discountRes && (discountRes.summary || discountRes.data)) {
          setDiscountLeakageIntel(discountRes.data || discountRes);
        } else {
          setDiscountLeakageIntel(null);
        }
        const summary = res?.summary || (res?.data && !Array.isArray(res.data) ? res.data.summary : null);
        const venues = res?.venues || res?.venueBreakdown || (res?.data && !Array.isArray(res.data) ? res.data.venues : null);
        if (summary && Array.isArray(venues)) {
          // Guard: '벨포레 리조트'(콘도/객실) 오매핑 항목 제외
          const validVenues = venues.filter((v: any) => v.venueName !== '벨포레 리조트');
          setChannelData({ summary, venues: validVenues });
        } else {
          setChannelData(null);
          setChannelError('API 응답에 summary/venues 완제품 데이터가 없습니다.');
        }
      } catch (err: any) {
        if (!isCancelled) {
          setChannelData(null);
          setChannelError(err?.message || 'leisure-channel-sales API 호출 실패');
        }
      } finally {
        if (!isCancelled) setChannelLoading(false);
      }
    };
    fetchChannels();
    return () => {
      isCancelled = true;
    };
  }, [startDate, endDate, isRange]);

  // 백엔드 비중(%) 값 표시 전용: null/undefined면 '-' (Fail-Stop, 클라이언트 재계산 금지)
  const showPct = (v: any) => (v === null || v === undefined || v === '' ? '-' : `${v}%`);
  const showWon = (v: any) => (v === null || v === undefined || v === '' ? '-' : `${formatCurrency(v)}원`);

  const { totalSales, topTickets } = useMemo(() => {
    // 1. Primary SSOT: core.salesByFacility (from /api/v6/dashboard/revenue-summary)
    // Official Gold Mart SSOT: contains 100% complete POS + PMS sales and proper category mapping
    if (core?.salesByFacility && core.salesByFacility.length > 0) {
      const ticketFacilities = core.salesByFacility.filter((item: any) => 
        (item.categoryCode === 'TICKET' || item.categoryCode === 'MOTO') && !item.isSubtotal
      );

      let ssotTotalSales = 0;
      if (core.salesByCategory && Array.isArray(core.salesByCategory)) {
        const ticketCat = core.salesByCategory.find((x: any) => x.categoryCode === 'TICKET');
        const motoCat = core.salesByCategory.find((x: any) => x.categoryCode === 'MOTO');
        ssotTotalSales = parseNumber(ticketCat?.todayActual || ticketCat?.totalSales || 0) +
                         parseNumber(motoCat?.todayActual || motoCat?.totalSales || 0);
      }

      const mappedTickets: Array<{ name: string; sales: number; qty: number; depth2: string }> = ticketFacilities
        .map((item: any) => {
          const name = item.shopName || item.facilityName || '기타';
          const sales = parseNumber(item.todayActual || item.totalSales || 0);
          const qty = parseNumber(item.totalVisitors || item.visitors || 0);
          const depth2 = item.partName || '티켓/레저';
          return { name, sales, qty, depth2 };
        })
        .filter((item: any) => item.sales > 0 || item.qty > 0)
        .sort((a: any, b: any) => b.sales - a.sales);

      return { 
        totalSales: ssotTotalSales, 
        topTickets: mappedTickets
      };
    }

    // 2. Secondary fallback: channelData (from /api/v6/report/leisure-channel-sales)
    if (channelData?.venues && channelData.venues.length > 0) {
      const grandTotal = parseNumber(channelData.summary?.totalRevenue || 0);
      const mapped = channelData.venues
        .filter((v: any) => v.venueName !== '벨포레 리조트') // Guard against room/resort mistagging
        .map((v: any) => ({
          name: v.venueName || '기타',
          sales: parseNumber(v.totalRevenue || 0),
          qty: parseNumber(v.totalVisitors || 0),
          depth2: '레저/체험'
        }))
        .filter((v: any) => v.sales > 0 || v.qty > 0)
        .sort((a: any, b: any) => b.sales - a.sales);

      return {
        totalSales: grandTotal,
        topTickets: mapped
      };
    }

    return { totalSales: 0, topTickets: [] };
  }, [core, channelData]);

  return (
    <div className="w-full max-w-[1920px] mx-auto p-8 space-y-8 pb-12">
      {/* Header */}
      <div className="bg-brand-mint rounded-[32px] p-8 xl:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-20 -bottom-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Ticket size={24} />
              <span className="font-medium tracking-widest text-sm">BELLE FORET LEISURE</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight mb-2 break-keep whitespace-nowrap">
              레저 영업장 대시보드
            </h1>
            <p className="text-[13px] text-emerald-50 font-medium break-keep">
              레저본부 카테고리에 속한 전체 영업장의 요약 데이터입니다.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 shrink-0">
            <GlobalDatePicker />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* 요약 카드 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12 rounded-full" />
            <h2 className="text-base font-bold text-slate-600 mb-6 flex items-center gap-2 relative z-10 whitespace-nowrap">
              <Wallet className="w-5 h-5 text-blue-500" /> 총 매출합계 <span className="text-xs font-normal text-slate-400">({endDate && startDate !== endDate ? '조회기간' : '조회일'})</span>
            </h2>
            <div className="text-3xl font-black text-slate-900 mb-2 tracking-tight relative z-10 tabular-nums whitespace-nowrap">
              {(channelLoading && !channelData) || (isLoading && !channelData) ? (
                <span className="text-slate-300 animate-pulse text-2xl font-bold">집계 중...</span>
              ) : (
                <>{formatCurrency(totalSales)} <span className="text-base font-normal text-slate-500">원</span></>
              )}
            </div>
            <p className="text-slate-500 text-xs relative z-10 font-medium whitespace-nowrap">순매출 기준 합산 (부가세 별도)</p>
          </div>

          {/* TOP 5 가장 많이 팔린 티켓 상품 요약 카드 */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                <Award className="w-5 h-5 text-amber-500" /> 가장 많이 팔린 티켓 TOP 5
              </h2>
              <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                <Ticket size={12} /> 티켓 품목
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-4 break-keep">
              레저본부 단일 티켓/패스 상품(트랜잭션) 기준 순위
            </p>

            <div className="space-y-3">
              {isTopItemsLoading ? (
                <div className="py-8 flex items-center justify-center text-slate-400 text-xs">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-mint mr-2"></div>
                  티켓 품목 순위를 불러오는 중입니다...
                </div>
              ) : apiTopItems.length > 0 ? (
                apiTopItems.map((t: any, idx: number) => {
                  const itemName = t.itemName || t.name;
                  const venueName = t.facilityName;
                  const sales = t.sales;
                  const qty = t.quantity || t.qty;

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-purple-50/40 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0 ? 'bg-amber-400 text-white shadow-xs' :
                          idx === 1 ? 'bg-slate-400 text-white' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-sm block truncate">{itemName}</span>
                          {venueName && (
                            <span className="text-xs text-slate-500 font-medium block truncate">
                              {venueName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 tabular-nums whitespace-nowrap ml-3">
                        <span className="font-bold text-sm text-slate-900 block">{formatCurrency(sales)}원</span>
                        <span className="text-xs text-slate-500 font-medium">{qty.toLocaleString()}개</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-200/50">
                  해당 기간 판매된 단일 티켓 상품 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 레저본부 영업장별 전체 실적 랭킹 */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 flex flex-col h-[520px] lg:h-[644px]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap break-keep">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Trophy className="w-6 h-6 text-amber-400" /> 전체 영업장 실적 (레저본부)
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap">매출액 기준 내림차순</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                총 {topTickets.length}개 업장 (스크롤 지원)
              </span>
            </div>

            {(channelLoading && !channelData) || (isLoading && !channelData) ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400 text-xs flex-1">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-mint mb-3"></div>
                영업장별 실적 데이터를 집계 중입니다...
              </div>
            ) : topTickets.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {topTickets.map((ticket, idx) => (
                  <div key={idx} className="flex items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="w-10 h-10 flex-shrink-0 bg-white rounded-xl shadow-xs flex items-center justify-center font-bold text-base mr-3 border border-slate-200 tabular-nums">
                      {idx === 0 ? <span className="text-amber-500 font-bold">1</span> :
                       idx === 1 ? <span className="text-slate-500 font-bold">2</span> :
                       idx === 2 ? <span className="text-amber-700 font-bold">3</span> :
                       <span className="text-slate-400 font-bold">{idx + 1}</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-brand-mint bg-brand-mint/10 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          {ticket.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium tabular-nums whitespace-nowrap">이용객수 {ticket.qty.toLocaleString()}명</p>
                    </div>
                    
                    <div className="text-right ml-4 tabular-nums whitespace-nowrap shrink-0">
                      <div className="font-bold text-base text-slate-900">{formatCurrency(ticket.sales)}원</div>
                      <div className="text-xs font-semibold text-slate-500">
                        ({totalSales > 0 ? ((ticket.sales / totalSales) * 100).toFixed(1) : 0}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex-1">
                <AlertCircle size={32} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium">선택하신 기간 내 그룹 영업장의 판매 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 레저본부 전체 영업장 판매채널(자사·OTA·POS·PMS) 매출 비중 — GET /api/v6/report/leisure-channel-sales */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <Globe className="w-5 h-5 text-indigo-500" /> 레저본부 전체 영업장별 판매채널 비중 (자사·OTA·POS·PMS)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 break-keep">
              놀이동산, 마운틴카트, 목장, 사계절썰매장, 모토아레나 등 레저본부 전체 영업장의 채널별(현장 POS · 자사 홈페이지 · 외부 OTA · 객실연계 PMS) 매출 및 비중
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">API: /api/v6/report/leisure-channel-sales</span>
        </div>

        {channelLoading ? (
          <div className="py-10 flex items-center justify-center text-slate-400 text-xs">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-mint mr-2"></div>
            레저본부 전체 영업장 채널별 매출 비중을 불러오는 중입니다...
          </div>
        ) : channelError || !channelData ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-sm flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-900">전체 영업장 판매채널(자사·OTA·POS·PMS) API 배포 대기 중</p>
                <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                  Ticket 30 대기
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed break-keep">
                모토아레나를 포함한 레저본부 전체 영업장(놀이동산, 마운틴카트, 목장, 사계절썰매장, 모토아레나, 마리나클럽, 미디어아트, 썸머랜드 등)의 자사 홈페이지 · 외부 OTA · 현장 POS · 객실 PMS 판매 비중 집계 API(<code className="font-mono text-slate-800">/api/v6/report/leisure-channel-sales</code>)가 백엔드에 정식 요청되었습니다.
              </p>
              <p className="text-xs text-slate-500 font-medium">
                백엔드 Vercel 프로덕션 배포 완료 즉시 실시간으로 전체 영업장 채널 비중 표가 자동 렌더링됩니다. (프론트엔드 무결성 원칙에 따라 임의의 가짜 숫자를 합성하지 않습니다)
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 4대 채널 요약 KPI 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 tabular-nums">
              <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-sm">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>현장 POS (현장발권)</span>
                  <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-full">현장 결제</span>
                </div>
                <div className="text-3xl font-black text-amber-300 mt-2">{showPct(channelData.summary?.posSharePct)}</div>
                <div className="text-xs text-slate-300/90 mt-1">매출 {showWon(channelData.summary?.posRevenue)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                  <span>자사 홈페이지 (Direct)</span>
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">수수료 0%</span>
                </div>
                <div className="text-3xl font-black text-emerald-600 mt-2">{showPct(channelData.summary?.homepageSharePct)}</div>
                <div className="text-xs text-slate-500 mt-1">매출 {showWon(channelData.summary?.homepageRevenue)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
                <div className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                  <span>순수 외부 OTA (대행사)</span>
                  <span className="text-[11px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">야놀자/네이버 등</span>
                </div>
                <div className="text-3xl font-black text-indigo-600 mt-2">{showPct(channelData.summary?.otaSharePct)}</div>
                <div className="text-xs text-indigo-700/90 mt-1">매출 {showWon(channelData.summary?.otaRevenue)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                  <span>객실 연계 (PMS)</span>
                  <span className="text-[11px] bg-slate-200/80 text-slate-700 font-semibold px-2 py-0.5 rounded-full">패키지/부대</span>
                </div>
                <div className="text-3xl font-black text-slate-900 mt-2">{showPct(channelData.summary?.pmsSharePct)}</div>
                <div className="text-xs text-slate-500 mt-1">매출 {showWon(channelData.summary?.pmsRevenue)}</div>
              </div>
            </div>

            {/* 전체 영업장별 채널 비중 매트릭스 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums min-w-[960px]">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-700 bg-slate-50">
                    <th className="py-3 px-4">영업장명</th>
                    <th className="py-3 px-3 text-right">총매출</th>
                    <th className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>현장 POS</span>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right bg-emerald-50/50">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-emerald-900">자사 홈페이지</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-indigo-900">외부 OTA</span>
                        <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>객실연계(PMS)</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">비중 %</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">주력 채널</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {channelData.venues?.map((v: any, idx: number) => {
                    const dominantTag = v.dominantChannel || (
                      v.posSharePct >= 60 ? '현장 POS 주력' :
                      v.homepageSharePct >= 30 ? '자사 채널 활성' :
                      v.otaSharePct >= 10 ? 'OTA 비중 높음' : '다채널 혼합'
                    );
                    const tagCls = dominantTag.includes('OTA') 
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : dominantTag.includes('자사')
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <tr key={v.venueName || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                          {v.venueName ?? '-'}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap font-black text-slate-900">
                          {showWon(v.totalRevenue)}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <span className="text-base lg:text-lg font-black text-slate-900 block leading-tight">
                            {showPct(v.posSharePct)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            {showWon(v.posRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap bg-emerald-50/20">
                          <span className="text-base lg:text-lg font-black text-emerald-700 block leading-tight">
                            {showPct(v.homepageSharePct)}
                          </span>
                          <span className="text-[11px] text-emerald-600/80 font-medium block mt-0.5">
                            {showWon(v.homepageRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap bg-indigo-50/30">
                          <span className="text-base lg:text-lg font-black text-indigo-700 block leading-tight">
                            {showPct(v.otaSharePct)}
                          </span>
                          <span className="text-[11px] text-indigo-600/80 font-medium block mt-0.5">
                            {showWon(v.otaRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <span className="text-base lg:text-lg font-black text-purple-700 block leading-tight">
                            {showPct(v.pmsSharePct)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            {showWon(v.pmsRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tagCls}`}>
                            {dominantTag}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-950">
                    <td className="py-4 px-4 whitespace-nowrap">레저본부 전체 총합계</td>
                    <td className="py-4 px-3 text-right whitespace-nowrap text-amber-300 font-black">
                      {showWon(channelData.summary?.totalRevenue)}
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <span className="text-base lg:text-lg font-black text-amber-300 block leading-tight">
                        {showPct(channelData.summary?.posSharePct)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                        {showWon(channelData.summary?.posRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap bg-emerald-950/40">
                      <span className="text-base lg:text-lg font-black text-emerald-300 block leading-tight">
                        {showPct(channelData.summary?.homepageSharePct)}
                      </span>
                      <span className="text-[11px] text-emerald-200/70 font-normal block mt-0.5">
                        {showWon(channelData.summary?.homepageRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap bg-indigo-950/80">
                      <span className="text-base lg:text-lg font-black text-indigo-200 block leading-tight">
                        {showPct(channelData.summary?.otaSharePct)}
                      </span>
                      <span className="text-[11px] text-indigo-300/80 font-normal block mt-0.5">
                        {showWon(channelData.summary?.otaRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <span className="text-base lg:text-lg font-black text-purple-200 block leading-tight">
                        {showPct(channelData.summary?.pmsSharePct)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                        {showWon(channelData.summary?.pmsRevenue)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap text-slate-400 text-xs font-normal">
                      전체 합계
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 3. [Ticket 34] 레저 티켓·POS 업장/권종별 정가 대비 할인 누수율(Price Realization Rate) 및 미사용 티켓 감사 */}
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-xs overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/40 via-white to-rose-50/30">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs shrink-0 mt-0.5">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900">
                  업장·권종별 정가 대비 할인 누수율(Price Realization Rate) 및 미사용 티켓 감사
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  V6 SSOT · Ticket 34
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                티켓(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">정상가격·할인금액·판매금액</code>) 및 POS(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">판매가·할인금액·판매금액</code>) 정가 실현율과 발권 후 미검표(<code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">티켓출력,티켓미사용</code>) 대기 물량을 정밀 감사합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {discountLeakageIntel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                정규 마트 연동 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle size={14} />
                Fail-Stop · 백엔드 API 배포 대기 (/api/v6/report/leisure-discount-leakage)
              </span>
            )}
          </div>
        </div>

        {!discountLeakageIntel ? (
          <div className="p-8 bg-slate-50/60">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle size={20} />
              </div>
              <h4 className="text-sm font-extrabold text-slate-800">
                [Zero-Fake / Fail-Stop] 레저·POS 할인 누수율 및 미사용 티켓 감사 정규 마트 API 연동 대기 중
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                백엔드 <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">GET /api/v6/report/leisure-discount-leakage</code> 배포 전까지 클라이언트 임의 추론이나 가짜 숫자를 생성하지 않고 <strong>Fail-Stop(결함 노출)</strong> 상태를 유지합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">정상가 총액 (List Price)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">정상가격 × 판매수량 집계 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">총 할인 누수액 (Discount)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">티켓·POS 할인금액 합산 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">정가 실현율 (Realization)</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">실매출 / 정상가 총액 비율 대기</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400">발권 후 미사용 티켓 잔액</div>
                  <div className="text-base font-black text-slate-400 mt-1">-</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">티켓출력,티켓미사용 상태 집계 대기</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">정상가 총액 (List Price)</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {showWon(discountLeakageIntel.summary?.totalListAmount)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  실매출액: {showWon(discountLeakageIntel.summary?.totalNetAmount)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">총 할인 공제액 (Discount Leakage)</div>
                <div className="text-xl font-black text-rose-600 mt-1">
                  {showWon(discountLeakageIntel.summary?.totalDiscountAmount)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  할인율: {showPct(discountLeakageIntel.summary?.discountRatePct ?? discountLeakageIntel.summary?.overallDiscountRate)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">정가 실현율 (Price Realization)</div>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  {showPct(discountLeakageIntel.summary?.realizationRatePct ?? discountLeakageIntel.summary?.overallRealizationRate)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  정상가 대비 실수취 비율
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-500">티켓출력 · 미사용 잔여 금액</div>
                <div className="text-xl font-black text-amber-700 mt-1">
                  {showWon(discountLeakageIntel.summary?.unusedTicketAmount ?? discountLeakageIntel.summary?.totalUnusedAmount)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  미사용 건수: {(discountLeakageIntel.summary?.unusedTicketCount ?? discountLeakageIntel.summary?.totalUnusedCount) != null ? `${Number(discountLeakageIntel.summary?.unusedTicketCount ?? discountLeakageIntel.summary?.totalUnusedCount).toLocaleString()}건` : '-'}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">업장 · 권종별 정가 대비 할인 누수 및 미사용 티켓 상세</span>
                <span className="text-[11px] text-slate-500">단위: 건 / 원 / %</span>
              </div>
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-bold">영업장명</th>
                      <th className="py-2.5 px-3 text-left font-bold">권종 · 메뉴명</th>
                      <th className="py-2.5 px-3 text-right font-bold">정상가 합계</th>
                      <th className="py-2.5 px-3 text-right font-bold">할인 금액</th>
                      <th className="py-2.5 px-3 text-right font-bold">실매출액</th>
                      <th className="py-2.5 px-3 text-right font-bold">정가 실현율</th>
                      <th className="py-2.5 px-3 text-right font-bold">판매(건수)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(discountLeakageIntel.topDiscountMenus || discountLeakageIntel.items || discountLeakageIntel.shops || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.shopName ?? '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.menuName ?? item.shopName ?? '-'}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{showWon(item.listAmount)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">{showWon(item.discountAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{showWon(item.netAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{showPct(item.realizationRatePct ?? item.realizationRate)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {item.salesCount != null ? `${Number(item.salesCount).toLocaleString()}건` : (item.unusedCount != null ? `${Number(item.unusedCount).toLocaleString()}건` : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
