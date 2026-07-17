'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type DateFilterContextType = {
  startMonth: string;
  setStartMonth: (month: string) => void;
  endMonth: string;
  setEndMonth: (month: string) => void;
};

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [startMonth, setStartMonth] = useState<string>(() => {
    return `2026-01`; // Default to start of year
  });

  const [endMonth, setEndMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const savedStart = localStorage.getItem('globalStartMonth');
    const savedEnd = localStorage.getItem('globalEndMonth');
    if (savedStart) setStartMonth(savedStart);
    if (savedEnd) setEndMonth(savedEnd);
  }, []);

  const handleSetStartMonth = (month: string) => {
    setStartMonth(month);
    localStorage.setItem('globalStartMonth', month);
  };

  const handleSetEndMonth = (month: string) => {
    setEndMonth(month);
    localStorage.setItem('globalEndMonth', month);
  };

  return (
    <DateFilterContext.Provider 
      value={{ 
        startMonth, 
        setStartMonth: handleSetStartMonth,
        endMonth,
        setEndMonth: handleSetEndMonth
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
