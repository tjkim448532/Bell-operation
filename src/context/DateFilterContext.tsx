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

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [startMonth, setStartMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalStartMonth');
      if (saved) return saved;
    }
    return '2026-07';
  });
  const [endMonth, setEndMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globalEndMonth');
      if (saved) return saved;
    }
    return '2026-07';
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
    return {
      startMonth: '2026-07',
      setStartMonth: () => {},
      endMonth: '2026-07',
      setEndMonth: () => {},
      isMounted: true
    };
  }
  return context;
}
