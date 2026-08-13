'use client';

import { useDateFilter } from '@/context/DateFilterContext';

export default function GlobalDateSelector() {
  const { startMonth, setStartMonth, endMonth, setEndMonth } = useDateFilter();

  return (
    <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-sm [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 shrink-0">
      <input 
        type="month" 
        value={startMonth} 
        onChange={(e) => setStartMonth(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="border-none bg-transparent px-3 py-1.5 text-sm outline-none text-white font-medium cursor-pointer" 
      />
      <span className="text-gray-400 font-medium">~</span>
      <input 
        type="month" 
        value={endMonth} 
        onChange={(e) => setEndMonth(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="border-none bg-transparent px-3 py-1.5 text-sm outline-none text-white font-medium cursor-pointer" 
      />
    </div>
  );
}
