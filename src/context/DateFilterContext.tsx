'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type DateFilterContextType = {
  startMonth: string;
  setStartMonth: (month: string) => void;
  endMonth: string;
  setEndMonth: (month: string) => void;
  isMounted: boolean;
};

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

const getCurrentYearMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [startMonth, setStartMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalStartMonth');
      if (saved) return saved;
    }
    return getCurrentYearMonth();
  });
  const [endMonth, setEndMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalEndMonth');
      if (saved) return saved;
    }
    return getCurrentYearMonth();
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedStart = localStorage.getItem('globalStartMonth');
    const savedEnd = localStorage.getItem('globalEndMonth');
    
    if (savedStart && savedStart !== startMonth) {
      setStartMonth(savedStart);
    }
    
    if (savedEnd && savedEnd !== endMonth) {
      setEndMonth(savedEnd);
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
    if (!month) return;
    setStartMonth(month);
    localStorage.setItem('globalStartMonth', month);
    if (endMonth && month > endMonth) {
      setEndMonth(month);
      localStorage.setItem('globalEndMonth', month);
    }
  };

  const handleSetEndMonth = (month: string) => {
    if (!month) return;
    setEndMonth(month);
    localStorage.setItem('globalEndMonth', month);
    if (startMonth && month < startMonth) {
      setStartMonth(month);
      localStorage.setItem('globalStartMonth', month);
    }
  };

  return (
    <DateFilterContext.Provider 
      value={{ 
        startMonth, 
        setStartMonth: handleSetStartMonth,
        endMonth,
        setEndMonth: handleSetEndMonth,
        isMounted
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    const cur = getCurrentYearMonth();
    return {
      startMonth: cur,
      setStartMonth: () => {},
      endMonth: cur,
      setEndMonth: () => {},
      isMounted: true
    };
  }
  return context;
}
