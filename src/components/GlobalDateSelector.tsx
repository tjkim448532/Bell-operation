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
      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-white/40 rounded-xl px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] text-slate-800">
        <Calendar size={14} className="text-[#00AE95] shrink-0" />
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          className="border-none bg-transparent text-xs outline-none text-slate-800 font-semibold cursor-pointer" 
        />
        <span className="text-slate-400 font-medium text-xs">~</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          className="border-none bg-transparent text-xs outline-none text-slate-800 font-semibold cursor-pointer" 
        />
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={setAugustPreset}
          className="px-3 py-1.5 rounded-xl text-2xs font-bold bg-white/90 text-[#00AE95] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-white hover:shadow-xs transition-all cursor-pointer"
        >
          8월 실적 (검증완료)
        </button>
        <button
          onClick={setTodayPreset}
          className="px-3 py-1.5 rounded-xl text-2xs font-bold bg-white/40 text-white hover:bg-white/60 transition-all cursor-pointer backdrop-blur-xs"
        >
          당일 (Today)
        </button>
      </div>
    </div>
  );
}
