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
    // 이전 localStorage에 남아있던 오래된 날짜 캐시 제거 (시크릿모드 불일치 원천 차단)
    try {
      localStorage.removeItem('startDate');
      localStorage.removeItem('endDate');
      localStorage.removeItem('isRange');
    } catch {
      // ignore
    }
    return sessionStorage.getItem('startDate') || getLatestClosedDateStr();
  });
  
  const [endDate, setEndDateState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('endDate') || null;
  });

  const [isRange, setIsRangeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('isRange') === 'true';
  });

  const setStartDate = useCallback((date: string) => {
    setStartDateState(date);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('startDate', date);
    }
  }, []);
  
  const setEndDate = useCallback((date: string | null) => {
    setEndDateState(date);
    if (typeof window !== 'undefined') {
      if (date) {
        sessionStorage.setItem('endDate', date);
        sessionStorage.setItem('isRange', 'true');
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
    const effectiveRange = rangeMode !== undefined ? rangeMode : (!!end && start !== end);
    setStartDateState(start);
    setEndDateState(effectiveRange ? end : null);
    setIsRangeState(effectiveRange);
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('startDate', start);
      if (end && effectiveRange) {
        sessionStorage.setItem('endDate', end);
        sessionStorage.setItem('isRange', 'true');
      } else {
        sessionStorage.removeItem('endDate');
        sessionStorage.removeItem('isRange');
      }
    }
  }, []);

  return (
    <DateContext.Provider value={{
      startDate,
      endDate,
      isRange,
      setStartDate,
      setEndDate,
      setIsRange,
      setDateRange
    }}>
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
