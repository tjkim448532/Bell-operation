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
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const savedStart = localStorage.getItem('globalStartDate');
    const savedEnd = localStorage.getItem('globalEndDate');
    if (savedStart) setStartDate(savedStart);
    if (savedEnd) setEndDate(savedEnd);
  }, []);

  const handleSetStartDate = (date: string) => {
    setStartDate(date);
    localStorage.setItem('globalStartDate', date);
  };

  const handleSetEndDate = (date: string) => {
    setEndDate(date);
    localStorage.setItem('globalEndDate', date);
  };

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
