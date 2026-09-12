"use client";

import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { formatNumber } from '@/lib/formatters';
import { TrendingUp, AlertCircle } from 'lucide-react';

export interface DailyTrendItem {
  date: string;
  revenue: number;
}

interface Props {
  data: DailyTrendItem[];
}

export default function MonthlyPnLTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-2">
        <AlertCircle className="text-amber-500" size={24} />
        <h4 className="text-sm font-bold text-slate-800">실시간 추이 데이터 대기 중</h4>
        <p className="text-2xs text-slate-500">백엔드 SSOT API로부터 조회 기간의 일자별 실측 데이터를 불러오는 중입니다.</p>
      </div>
    );
  }

  // 일자별 라벨 축약 (YYYY-MM-DD -> MM/DD)
  const chartData = data.map((d) => ({
    date: d.date.length >= 10 ? d.date.substring(5) : d.date,
    revenue: d.revenue || 0,
  }));

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              일자별 실시간 매출 추이 (백엔드 SSOT 실측 데이터)
            </h3>
            <p className="text-2xs text-slate-500">
              조회 기간 내 백엔드 API 원천 일자별 실적 바인딩 (총 {data.length}일간 실적)
            </p>
          </div>
        </div>
        <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          실측 100% 반영
        </span>
      </div>

      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${formatNumber(Math.round(val / 1000000))}M`}
            />
            <Tooltip 
              formatter={(val: any) => [formatNumber(Number(val)), '순매출액']}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="revenue" name="일별 실측 순매출" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              name="매출 추세선" 
              stroke="#6366f1" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
