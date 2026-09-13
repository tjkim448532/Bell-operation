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
    <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group flex flex-col items-center">
      <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-[#00AE95]/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
          <p className="text-2xs text-slate-400 mt-0.5">
            총합계: <strong className="text-slate-800 font-mono">{formatNumber(total)}</strong>
          </p>
        </div>
        <span className="text-2xs font-extrabold px-3 py-1 rounded-full bg-[#E6F7F4] text-[#00AE95] shadow-2xs">
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
