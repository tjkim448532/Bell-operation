"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getLatestClosedDateStr } from '../lib/dateUtils';

interface DateContextType {
  startDate: string;
  endDate: string | null;
  isRange: boolean;
  isMounted: boolean;
  setStartDate: (date: string) => void;
  setEndDate: (date: string | null) => void;
  setIsRange: (isRange: boolean) => void;
  setDateRange: (startDate: string, endDate: string | null, isRange?: boolean) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultClosedDate = getLatestClosedDateStr();

  // SSR 및 클라이언트 최초 Hydration 일치를 위해 초기값은 결정론적으로 고정하고 useEffect에서 스토리지 동기화
  const [startDate, setStartDateState] = useState<string>(defaultClosedDate);
  const [endDate, setEndDateState] = useState<string | null>(null);
  const [isRange, setIsRangeState] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.removeItem('startDate');
      localStorage.removeItem('endDate');
      localStorage.removeItem('isRange');

      const savedStart =
        sessionStorage.getItem('startDate') ||
        localStorage.getItem('globalStartDate') ||
        defaultClosedDate;
      const savedEnd =
        sessionStorage.getItem('endDate') ||
        localStorage.getItem('globalEndDate') ||
        null;
      const savedIsRange =
        sessionStorage.getItem('isRange') === 'true' ||
        Boolean(savedEnd && savedStart !== savedEnd);

      setStartDateState(savedStart);
      setEndDateState(savedIsRange ? savedEnd : null);
      setIsRangeState(savedIsRange);
    } catch {
      // ignore storage errors
    }
    setIsMounted(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'globalStartDate' && e.newValue && e.newValue.length === 10) {
        setStartDateState(e.newValue);
      }
      if (e.key === 'globalEndDate' && e.newValue && e.newValue.length === 10) {
        setEndDateState(e.newValue);
        setIsRangeState(true);
      }
    };

    const handleCustomDateSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.source === 'DateContext') return;
      if (detail.startDate && detail.startDate.length === 10) {
        setStartDateState(detail.startDate);
      }
      if (detail.isRange && detail.endDate && detail.endDate.length === 10) {
        setEndDateState(detail.endDate);
        setIsRangeState(true);
      } else {
        setEndDateState(null);
        setIsRangeState(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bell-date-sync', handleCustomDateSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bell-date-sync', handleCustomDateSync);
    };
  }, [defaultClosedDate]);

  const setStartDate = useCallback((date: string) => {
    setStartDateState(date);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('startDate', date);
      localStorage.setItem('globalStartDate', date);
      localStorage.setItem('globalStartMonth', date.slice(0, 7));
      window.dispatchEvent(
        new CustomEvent('bell-date-sync', {
          detail: { startDate: date, endDate: null, isRange: false, source: 'DateContext' },
        })
      );
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
      window.dispatchEvent(
        new CustomEvent('bell-date-sync', {
          detail: {
            startDate: start,
            endDate: effectiveRange && end ? end : start,
            isRange: effectiveRange,
            source: 'DateContext',
          },
        })
      );
    }
  }, []);

  return (
    <DateContext.Provider
      value={{
        startDate,
        endDate,
        isRange,
        isMounted,
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
