'use client';

import { useDateFilter } from '@/context/DateFilterContext';

export default function GlobalDateSelector() {
  const { startDate, setStartDate, endDate, setEndDate } = useDateFilter();

  return (
    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-sm [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-75 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 shrink-0">
      <input 
        type="date" 
        value={startDate} 
        onChange={(e) => setStartDate(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="border-none bg-transparent px-3 py-1.5 text-xs sm:text-sm outline-none text-white font-medium cursor-pointer" 
      />
      <span className="text-slate-400 font-medium text-xs sm:text-sm">~</span>
      <input 
        type="date" 
        value={endDate} 
        onChange={(e) => setEndDate(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="border-none bg-transparent px-3 py-1.5 text-xs sm:text-sm outline-none text-white font-medium cursor-pointer" 
      />
    </div>
  );
}
