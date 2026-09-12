'use client';

import { useDateFilter } from '@/context/DateFilterContext';
import { Calendar, RotateCcw } from 'lucide-react';

export default function GlobalDateSelector() {
  const { startDate, setStartDate, endDate, setEndDate, isMounted } = useDateFilter();

  if (!isMounted) return null;

  const setAugustPreset = () => {
    setStartDate('2026-08-01');
    setEndDate('2026-08-31');
  };

  const setTodayPreset = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Calendar Range Inputs */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xs">
        <Calendar size={14} className="text-emerald-400 shrink-0" />
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          style={{ colorScheme: 'dark' }}
          className="border-none bg-transparent text-xs outline-none text-white font-medium cursor-pointer" 
        />
        <span className="text-slate-500 font-medium text-xs">~</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          style={{ colorScheme: 'dark' }}
          className="border-none bg-transparent text-xs outline-none text-white font-medium cursor-pointer" 
        />
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={setAugustPreset}
          className="px-2.5 py-1.5 rounded-lg text-2xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 transition-colors cursor-pointer"
        >
          8월 실적 (검증완료)
        </button>
        <button
          onClick={setTodayPreset}
          className="px-2.5 py-1.5 rounded-lg text-2xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          당일 (Today)
        </button>
      </div>
    </div>
  );
}
