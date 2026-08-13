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
  const [startMonth, setStartMonth] = useState<string>('2026-01');
  const [endMonth, setEndMonth] = useState<string>('2026-08');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedStart = localStorage.getItem('globalStartMonth');
    const savedEnd = localStorage.getItem('globalEndMonth');
    
    if (savedStart) {
      setStartMonth(savedStart);
    }
    
    if (savedEnd) {
      setEndMonth(savedEnd);
    } else {
      const d = new Date();
      setEndMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'globalStartMonth' && e.newValue) {
        setStartMonth(e.newValue);
      }
      if (e.key === 'globalEndMonth' && e.newValue) {
        setEndMonth(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
    return {
      startMonth: '2026-01',
      setStartMonth: () => {},
      endMonth: '2026-06',
      setEndMonth: () => {}
    };
  }
  return context;
}
