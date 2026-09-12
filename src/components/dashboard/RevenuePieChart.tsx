'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface RevenuePieChartProps {
  divisions?: any[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

export default function RevenuePieChart({ divisions }: RevenuePieChartProps) {
  if (!divisions || divisions.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center min-h-[300px] h-full">
        <PieChartIcon className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-700">데이터 대기 중</p>
      </div>
    );
  }

  // Find 레저본부 division (and 모토아레나 if you want to include it, but the user explicitly requested "레저본부 영업장 리스트", so we might just combine them or only pick 레저본부)
  // According to rule: "벨포레굿즈, 기획전, 주차관제, 모토아레나, 미사용 티켓은 단독 소계 1개로 생성"
  const leisureDivision = divisions.find(d => d.orgDivision === '레저본부');
  
  if (!leisureDivision || !leisureDivision.venues || leisureDivision.venues.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center min-h-[300px] h-full">
        <PieChartIcon className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-700">레저본부 데이터가 없습니다.</p>
      </div>
    );
  }

  // Transform venues into pie data
  const rawData = leisureDivision.venues.map((v: any) => ({
    name: v.venueName,
    revenue: v.venueSubtotal?.todayActual || 0
  })).filter((v: any) => v.revenue > 0);

  // Note: if MOTO ARENA needs to be added as a venue in the pie chart:
  const motoDivision = divisions.find(d => d.orgDivision === '모토아레나');
  if (motoDivision && motoDivision.divisionSubtotal?.todayActual > 0) {
    rawData.push({
      name: '모토아레나',
      revenue: motoDivision.divisionSubtotal.todayActual
    });
  }

  // Calculate total for percentages
  const totalRevenue = rawData.reduce((sum: number, item: any) => sum + item.revenue, 0);

  const pieData = rawData
    .map((item: any) => ({
      ...item,
      sharePercent: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col h-full min-h-[300px]">
      <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-2 flex items-center">
        <PieChartIcon className="w-4 h-4 mr-2 text-blue-600" /> 레저본부 영업장별 매출 비중
      </h2>
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center h-full gap-4 mt-2">
        <div className="w-full sm:w-1/2 h-[200px] sm:h-[250px]">
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
        
        <div className="w-full sm:w-1/2 flex flex-col gap-2 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
          {pieData.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 truncate">
                <span className="min-w-3 min-h-3 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="font-medium text-slate-700 truncate" title={entry.name}>{entry.name}</span>
              </div>
              <div className="flex items-center gap-3 text-right shrink-0">
                <span className="font-bold text-slate-900 tabular-nums">{entry.sharePercent.toFixed(1)}%</span>
              </div>
            </div>
          ))}
          <div className="mt-2 pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-bold shrink-0">
            <span className="text-slate-500">총합계</span>
            <span className="text-blue-600 tabular-nums">100.0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}