'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type DateFilterContextType = {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
};

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  // Try to load from localStorage, otherwise default to current month
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const d = new Date();
    const defaultStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const savedStart = localStorage.getItem('globalStartDate') || defaultStart;
    const savedEnd = localStorage.getItem('globalEndDate') || defaultEnd;

    setStartDate(savedStart);
    setEndDate(savedEnd);
  }, []);

  const handleSetStartDate = (date: string) => {
    setStartDate(date);
    localStorage.setItem('globalStartDate', date);
  };

  const handleSetEndDate = (date: string) => {
    setEndDate(date);
    localStorage.setItem('globalEndDate', date);
  };

  if (!startDate || !endDate) return null; // Avoid hydration mismatch by waiting

  return (
    <DateFilterContext.Provider 
      value={{ 
        startDate, 
        endDate, 
        setStartDate: handleSetStartDate, 
        setEndDate: handleSetEndDate 
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
