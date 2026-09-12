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
import { TrendingUp } from 'lucide-react';

export interface MonthlyTrendData {
  month: string;      // '1월', '2월', ...
  revenue: number;    // 매출
  expense: number;    // 비용
  profit: number;     // 손익
}

interface Props {
  data: MonthlyTrendData[];
}

export default function MonthlyPnLTrendChart({ data }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              월별 매출·비용·손익(P&L) 추이 분석
            </h3>
            <p className="text-2xs text-slate-500">
              월별 레저 순매출 및 안분 비용 대비 영업 손익 추이 (막대: 매출/비용, 선: 영업손익)
            </p>
          </div>
        </div>
        <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          단위: 천원 (절사) / 서식: #,##0
        </span>
      </div>

      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              stroke="#64748b" 
              fontSize={11} 
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
              formatter={(val: any, name: any) => [formatNumber(Number(val)), name]}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="revenue" name="레저 순매출" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Bar dataKey="expense" name="파트 분배비용" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Line 
              type="monotone" 
              dataKey="profit" 
              name="영업 손익 (P&L)" 
              stroke="#6366f1" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
