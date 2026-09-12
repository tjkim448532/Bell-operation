'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign } from 'lucide-react';

interface LeisureRevenueListProps {
  divisions?: any[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

export default function LeisureRevenueList({ divisions }: LeisureRevenueListProps) {
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  if (!divisions || divisions.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center h-full min-h-[300px]">
        <DollarSign className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-700">데이터 대기 중</p>
      </div>
    );
  }

  // Find 레저본부 division
  const leisureDivision = divisions.find(d => d.orgDivision === '레저본부');
  
  if (!leisureDivision || !leisureDivision.parts || leisureDivision.parts.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center h-full min-h-[300px]">
        <DollarSign className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-700">레저본부 데이터가 없습니다.</p>
      </div>
    );
  }

  // Extract the 4 parts
  const rawParts = leisureDivision.parts.map((p: any) => {
    const revenue = p.partSubtotal?.todayActual || p.part_subtotal?.todayActual || 0;
    const venues = (p.venues || []).map((v: any) => ({
      name: v.venueName,
      revenue: v.venueSubtotal?.todayActual || 0
    })).filter((v: any) => v.revenue > 0)
    .sort((a: any, b: any) => b.revenue - a.revenue);
    
    return {
      name: p.partName,
      revenue,
      venues
    };
  }).filter((p: any) => p.revenue > 0);

  const totalRevenue = rawParts.reduce((sum: number, p: any) => sum + p.revenue, 0);

  const listData = rawParts
    .map((item: any) => ({
      ...item,
      sharePercent: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
      venues: item.venues.map((v: any) => ({
        ...v,
        sharePercent: totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0
      }))
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue);

  const toggleAccordion = (partName: string) => {
    setExpandedPart(expandedPart === partName ? null : partName);
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col h-full min-h-[300px]">
      <div className="flex justify-between items-end mb-5">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center">
          <DollarSign className="w-4 h-4 mr-2 text-blue-600" /> 레저본부 부서별 매출 현황
        </h2>
        <div className="text-right">
          <span className="text-2xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium mb-1 inline-block">레저본부 총계</span>
          <div className="font-bold text-slate-900 text-sm sm:text-base tabular-nums">
            {formatCurrency(totalRevenue)} <span className="text-xs text-slate-500 font-normal">원</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        {listData.map((entry: any, idx: number) => (
          <div key={idx} className="flex flex-col border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/30 mb-2 transition-all hover:border-slate-300">
            <button 
              onClick={() => toggleAccordion(entry.name)}
              className="flex items-center justify-between p-4 transition-colors cursor-pointer w-full text-left bg-white hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="min-w-3 min-h-3 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="font-bold text-slate-800 text-sm sm:text-base">{entry.name}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="font-bold text-slate-900 text-sm tabular-nums">{formatCurrency(entry.revenue)}</span>
                  <span className="text-xs text-slate-400 font-medium tabular-nums">{entry.sharePercent.toFixed(1)}%</span>
                </div>
                <div className="p-1 rounded-full bg-slate-100">
                  {expandedPart === entry.name ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                </div>
              </div>
            </button>
            
            {expandedPart === entry.name && entry.venues.length > 0 && (
              <div className="px-4 pb-4 pt-2 flex flex-col gap-3 bg-slate-50 border-t border-slate-100">
                {entry.venues.map((venue: any, vIdx: number) => (
                  <div key={vIdx} className="flex items-center justify-between pl-6 pr-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></div>
                      <span className="text-slate-700 font-medium">{venue.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-800 font-bold tabular-nums">{formatCurrency(venue.revenue)}</span>
                      <span className="text-slate-400 font-medium tabular-nums text-xs w-10 text-right">{venue.sharePercent.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
