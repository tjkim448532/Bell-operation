'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategorySales {
  categoryCode: string;
  categoryName: string;
  revenue: number;
  sharePercent: number;
  isSubtotal: boolean;
}

interface RevenuePieChartProps {
  salesByCategory?: CategorySales[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

export default function RevenuePieChart({ salesByCategory }: RevenuePieChartProps) {
  if (!salesByCategory || salesByCategory.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center min-h-[300px] h-full">
        <PieChartIcon className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-700">데이터 대기 중</p>
      </div>
    );
  }

  const pieData = salesByCategory
    .filter(item => item.isSubtotal && item.categoryCode !== 'TOTAL' && item.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col h-full">
      <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-2 flex items-center">
        <PieChartIcon className="w-4 h-4 mr-2 text-blue-600" /> 레저본부 영업장별 매출 비중
      </h2>
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center h-full">
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
                nameKey="categoryName"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any) => [formatCurrency(Number(value)) + ' 원', '매출액']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full sm:w-1/2 mt-4 sm:mt-0 flex flex-col gap-2 justify-center">
          {pieData.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="font-medium text-slate-700">{entry.categoryName}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="font-bold text-slate-900 tabular-nums">{entry.sharePercent.toFixed(1)}%</span>
              </div>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500">총합계</span>
            <span className="text-blue-600 tabular-nums">{pieData.reduce((sum, item) => sum + item.sharePercent, 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}