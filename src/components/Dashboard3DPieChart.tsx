"use client";

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatNumber } from '@/lib/formatters';

export interface PieChartItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: PieChartItem[];
  title: string;
  metricLabel?: string;
}

export default function Dashboard3DPieChart({ data, title, metricLabel = '금액' }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-2xs text-slate-400 mt-0.5">
            총합계: <strong className="text-slate-700 font-mono">{formatNumber(total)}</strong>
          </p>
        </div>
        <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          3D Perspective
        </span>
      </div>

      {/* 3D Container with Isometric CSS Transform */}
      <div 
        className="w-full h-72 relative flex items-center justify-center"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div 
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{
            transform: 'rotateX(28deg) rotateY(0deg) scaleY(0.92)',
            filter: 'drop-shadow(0px 18px 16px rgba(15, 23, 42, 0.18))',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip 
                formatter={(val: any) => [formatNumber(Number(val)), metricLabel]}
                contentStyle={{
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={40} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2.5}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                    className="transition-opacity duration-200 cursor-pointer"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
