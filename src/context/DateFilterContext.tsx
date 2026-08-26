'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type DateFilterContextType = {
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  startMonth: string;
  setStartMonth: (month: string) => void;
  endMonth: string;
  setEndMonth: (month: string) => void;
  isMounted: boolean;
};

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

const getCurrentMonthStartAndEnd = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    startDate: `${y}-${m}-01`,
    endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    startMonth: `${y}-${m}`,
    endMonth: `${y}-${m}`
  };
};

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const defaultDates = getCurrentMonthStartAndEnd();

  const [startDate, setStartDateState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('globalStartDate');
      if (savedDate && savedDate.length === 10) return savedDate;
      const savedMonth = localStorage.getItem('globalStartMonth');
      if (savedMonth && savedMonth.length === 7) return `${savedMonth}-01`;
    }
    return defaultDates.startDate;
  });

  const [endDate, setEndDateState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('globalEndDate');
      if (savedDate && savedDate.length === 10) return savedDate;
      const savedMonth = localStorage.getItem('globalEndMonth');
      if (savedMonth && savedMonth.length === 7) {
        const [ey, em] = savedMonth.split('-').map(Number);
        const lastDay = new Date(ey, em, 0).getDate();
        return `${savedMonth}-${String(lastDay).padStart(2, '0')}`;
      }
    }
    return defaultDates.endDate;
  });

  const [isMounted, setIsMounted] = useState(false);

  const startMonth = startDate.slice(0, 7);
  const endMonth = endDate.slice(0, 7);

  useEffect(() => {
    setIsMounted(true);
    const savedStart = localStorage.getItem('globalStartDate') || (localStorage.getItem('globalStartMonth') ? `${localStorage.getItem('globalStartMonth')}-01` : '');
    const savedEnd = localStorage.getItem('globalEndDate') || '';

    if (savedStart && savedStart.length === 10 && savedStart !== startDate) {
      setStartDateState(savedStart);
    }
    if (savedEnd && savedEnd.length === 10 && savedEnd !== endDate) {
      setEndDateState(savedEnd);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'globalStartDate' && e.newValue && e.newValue.length === 10) {
        setStartDateState(e.newValue);
      }
      if (e.key === 'globalEndDate' && e.newValue && e.newValue.length === 10) {
        setEndDateState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSetStartDate = (date: string) => {
    if (!date || date.length !== 10) return;
    setStartDateState(date);
    localStorage.setItem('globalStartDate', date);
    localStorage.setItem('globalStartMonth', date.slice(0, 7));
    if (endDate && date > endDate) {
      setEndDateState(date);
      localStorage.setItem('globalEndDate', date);
      localStorage.setItem('globalEndMonth', date.slice(0, 7));
    }
  };

  const handleSetEndDate = (date: string) => {
    if (!date || date.length !== 10) return;
    setEndDateState(date);
    localStorage.setItem('globalEndDate', date);
    localStorage.setItem('globalEndMonth', date.slice(0, 7));
    if (startDate && date < startDate) {
      setStartDateState(date);
      localStorage.setItem('globalStartDate', date);
      localStorage.setItem('globalStartMonth', date.slice(0, 7));
    }
  };

  const handleSetStartMonth = (month: string) => {
    if (!month || month.length !== 7) return;
    handleSetStartDate(`${month}-01`);
  };

  const handleSetEndMonth = (month: string) => {
    if (!month || month.length !== 7) return;
    const [ey, em] = month.split('-').map(Number);
    const lastDay = new Date(ey, em, 0).getDate();
    handleSetEndDate(`${month}-${String(lastDay).padStart(2, '0')}`);
  };

  return (
    <DateFilterContext.Provider 
      value={{ 
        startDate,
        setStartDate: handleSetStartDate,
        endDate,
        setEndDate: handleSetEndDate,
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
    const cur = getCurrentMonthStartAndEnd();
    return {
      startDate: cur.startDate,
      setStartDate: () => {},
      endDate: cur.endDate,
      setEndDate: () => {},
      startMonth: cur.startMonth,
      setStartMonth: () => {},
      endMonth: cur.endMonth,
      setEndMonth: () => {},
      isMounted: true
    };
  }
  return context;
}
