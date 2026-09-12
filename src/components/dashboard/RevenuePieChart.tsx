'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { PieChart as PieChartIcon, ChevronDown, ChevronRight } from 'lucide-react';

interface RevenuePieChartProps {
  divisions?: any[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

export default function RevenuePieChart({ divisions }: RevenuePieChartProps) {
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  if (!divisions || divisions.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center min-h-[300px] h-full">
        <PieChartIcon className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-700">데이터 대기 중</p>
      </div>
    );
  }

  // Find 레저본부 division
  const leisureDivision = divisions.find(d => d.orgDivision === '레저본부');
  
  if (!leisureDivision || !leisureDivision.parts || leisureDivision.parts.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center min-h-[300px] h-full">
        <PieChartIcon className="w-12 h-12 mb-3 text-slate-300" />
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

  const pieData = rawParts
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
      <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-2 flex items-center">
        <PieChartIcon className="w-4 h-4 mr-2 text-blue-600" /> 레저본부 영업장별 매출 비중
      </h2>
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center h-full gap-4 mt-2">
        <div className="w-full sm:w-[45%] h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="revenue"
                nameKey="name"
              >
                {pieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any) => [formatCurrency(Number(value)) + ' 원', '매출액']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-full sm:w-[55%] flex flex-col gap-1 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
          {pieData.map((entry: any, idx: number) => (
            <div key={idx} className="flex flex-col border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50 mb-1">
              <button 
                onClick={() => toggleAccordion(entry.name)}
                className="flex items-center justify-between p-2.5 hover:bg-slate-100 transition-colors cursor-pointer w-full text-left"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="min-w-3 min-h-3 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">{entry.sharePercent.toFixed(1)}%</span>
                  {expandedPart === entry.name ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              {expandedPart === entry.name && entry.venues.length > 0 && (
                <div className="px-3 pb-2 pt-1 flex flex-col gap-1.5 bg-white border-t border-slate-100">
                  {entry.venues.map((venue: any, vIdx: number) => (
                    <div key={vIdx} className="flex items-center justify-between pl-5 pr-6 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span className="text-slate-600 font-medium truncate" title={venue.name}>{venue.name}</span>
                      </div>
                      <span className="text-slate-700 font-medium tabular-nums shrink-0">{venue.sharePercent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="mt-2 pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-bold shrink-0 px-2">
            <span className="text-slate-500">총합계</span>
            <span className="text-blue-600 tabular-nums">100.0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}