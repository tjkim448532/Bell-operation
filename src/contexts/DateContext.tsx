"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { getLatestClosedDateStr } from '../lib/dateUtils';

interface DateContextType {
  startDate: string;
  endDate: string | null;
  isRange: boolean;
  setStartDate: (date: string) => void;
  setEndDate: (date: string | null) => void;
  setIsRange: (isRange: boolean) => void;
  setDateRange: (startDate: string, endDate: string | null, isRange?: boolean) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [startDate, setStartDateState] = useState<string>(() => {
    if (typeof window === 'undefined') return getLatestClosedDateStr();
    try {
      localStorage.removeItem('startDate');
      localStorage.removeItem('endDate');
      localStorage.removeItem('isRange');
    } catch {
      // ignore
    }
    return (
      sessionStorage.getItem('startDate') ||
      localStorage.getItem('globalStartDate') ||
      getLatestClosedDateStr()
    );
  });

  const [endDate, setEndDateState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('endDate') || localStorage.getItem('globalEndDate') || null;
  });

  const [isRange, setIsRangeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const savedEnd = sessionStorage.getItem('endDate') || localStorage.getItem('globalEndDate');
    const savedStart = sessionStorage.getItem('startDate') || localStorage.getItem('globalStartDate');
    return sessionStorage.getItem('isRange') === 'true' || Boolean(savedEnd && savedStart !== savedEnd);
  });

  const setStartDate = useCallback((date: string) => {
    setStartDateState(date);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('startDate', date);
      localStorage.setItem('globalStartDate', date);
      localStorage.setItem('globalStartMonth', date.slice(0, 7));
    }
  }, []);

  const setEndDate = useCallback((date: string | null) => {
    setEndDateState(date);
    if (typeof window !== 'undefined') {
      if (date) {
        sessionStorage.setItem('endDate', date);
        sessionStorage.setItem('isRange', 'true');
        localStorage.setItem('globalEndDate', date);
        localStorage.setItem('globalEndMonth', date.slice(0, 7));
      } else {
        sessionStorage.removeItem('endDate');
        sessionStorage.removeItem('isRange');
      }
    }
    setIsRangeState(!!date);
  }, []);

  const setIsRange = useCallback((range: boolean) => {
    setIsRangeState(range);
    if (typeof window !== 'undefined') {
      if (range) {
        sessionStorage.setItem('isRange', 'true');
      } else {
        sessionStorage.removeItem('isRange');
        sessionStorage.removeItem('endDate');
      }
    }
    if (!range) {
      setEndDateState(null);
    }
  }, []);

  const setDateRange = useCallback((start: string, end: string | null, rangeMode?: boolean) => {
    const effectiveRange = rangeMode !== undefined ? rangeMode : Boolean(end && start !== end);
    setStartDateState(start);
    setEndDateState(effectiveRange ? end : null);
    setIsRangeState(effectiveRange);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('startDate', start);
      localStorage.setItem('globalStartDate', start);
      localStorage.setItem('globalStartMonth', start.slice(0, 7));
      if (end && effectiveRange) {
        sessionStorage.setItem('endDate', end);
        sessionStorage.setItem('isRange', 'true');
        localStorage.setItem('globalEndDate', end);
        localStorage.setItem('globalEndMonth', end.slice(0, 7));
      } else {
        sessionStorage.removeItem('endDate');
        sessionStorage.removeItem('isRange');
        localStorage.setItem('globalEndDate', start);
        localStorage.setItem('globalEndMonth', start.slice(0, 7));
      }
    }
  }, []);

  return (
    <DateContext.Provider
      value={{
        startDate,
        endDate,
        isRange,
        setStartDate,
        setEndDate,
        setIsRange,
        setDateRange,
      }}
    >
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};
