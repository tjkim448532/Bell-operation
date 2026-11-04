'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getLatestClosedDateStr } from '@/lib/dateUtils';

type DateFilterContextType = {
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  setDateRange: (start: string, end: string) => void;
  startMonth: string;
  setStartMonth: (month: string) => void;
  endMonth: string;
  setEndMonth: (month: string) => void;
  isMounted: boolean;
};

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

const getCurrentMonthStartAndEnd = () => {
  const closedDate = getLatestClosedDateStr();
  const [yStr, mStr] = closedDate.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const lastDay = new Date(y, m, 0).getDate();
  const mPadded = String(m).padStart(2, '0');
  return {
    startDate: `${y}-${mPadded}-01`,
    endDate: `${y}-${mPadded}-${String(lastDay).padStart(2, '0')}`,
    startMonth: `${y}-${mPadded}`,
    endMonth: `${y}-${mPadded}`,
  };
};

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const defaultDates = getCurrentMonthStartAndEnd();

  // SSR 및 클라이언트 최초 Hydration 일치를 위해 초기값은 결정론적 기본값으로 고정 후 useEffect에서 스토리지 복원
  const [startDate, setStartDateState] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDateState] = useState<string>(defaultDates.endDate);
  const [isMounted, setIsMounted] = useState(false);

  const startDateRef = useRef<string>(defaultDates.startDate);
  const endDateRef = useRef<string>(defaultDates.endDate);

  const startMonth = startDate.slice(0, 7);
  const endMonth = endDate.slice(0, 7);

  useEffect(() => {
    startDateRef.current = startDate;
  }, [startDate]);

  useEffect(() => {
    endDateRef.current = endDate;
  }, [endDate]);

  useEffect(() => {
    let restoredStart = defaultDates.startDate;
    let restoredEnd = defaultDates.endDate;

    try {
      const savedStart =
        localStorage.getItem('globalStartDate') ||
        (localStorage.getItem('globalStartMonth') ? `${localStorage.getItem('globalStartMonth')}-01` : '');
      const savedEnd =
        localStorage.getItem('globalEndDate') ||
        (() => {
          const sm = localStorage.getItem('globalEndMonth');
          if (sm && sm.length === 7) {
            const [ey, em] = sm.split('-').map(Number);
            const lastDay = new Date(ey, em, 0).getDate();
            return `${sm}-${String(lastDay).padStart(2, '0')}`;
          }
          return '';
        })();

      if (savedStart && savedStart.length === 10) {
        restoredStart = savedStart;
      }
      if (savedEnd && savedEnd.length === 10) {
        restoredEnd = savedEnd;
      }
    } catch {
      // ignore storage errors
    }

    startDateRef.current = restoredStart;
    endDateRef.current = restoredEnd;
    setStartDateState(restoredStart);
    setEndDateState(restoredEnd);
    setIsMounted(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'globalStartDate' && e.newValue && e.newValue.length === 10) {
        startDateRef.current = e.newValue;
        setStartDateState(e.newValue);
      }
      if (e.key === 'globalEndDate' && e.newValue && e.newValue.length === 10) {
        endDateRef.current = e.newValue;
        setEndDateState(e.newValue);
      }
    };

    const handleCustomDateSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.source === 'DateFilterContext') return;
      if (detail.startDate && detail.startDate.length === 10) {
        startDateRef.current = detail.startDate;
        setStartDateState(detail.startDate);
      }
      const nextEnd = detail.endDate && detail.endDate.length === 10 ? detail.endDate : detail.startDate;
      if (nextEnd && nextEnd.length === 10) {
        endDateRef.current = nextEnd;
        setEndDateState(nextEnd);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bell-date-sync', handleCustomDateSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bell-date-sync', handleCustomDateSync);
    };
  }, []);

  const persistAndBroadcast = useCallback((nextStart: string, nextEnd: string) => {
    startDateRef.current = nextStart;
    endDateRef.current = nextEnd;
    setStartDateState(nextStart);
    setEndDateState(nextEnd);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('globalStartDate', nextStart);
        localStorage.setItem('globalStartMonth', nextStart.slice(0, 7));
        localStorage.setItem('globalEndDate', nextEnd);
        localStorage.setItem('globalEndMonth', nextEnd.slice(0, 7));
        sessionStorage.setItem('startDate', nextStart);
        if (nextStart !== nextEnd) {
          sessionStorage.setItem('endDate', nextEnd);
          sessionStorage.setItem('isRange', 'true');
        } else {
          sessionStorage.removeItem('endDate');
          sessionStorage.removeItem('isRange');
        }
        window.dispatchEvent(
          new CustomEvent('bell-date-sync', {
            detail: {
              startDate: nextStart,
              endDate: nextStart !== nextEnd ? nextEnd : null,
              isRange: nextStart !== nextEnd,
              source: 'DateFilterContext',
            },
          })
        );
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const handleSetDateRange = useCallback(
    (start: string, end: string) => {
      if (!start || start.length !== 10 || !end || end.length !== 10) return;
      const finalStart = start <= end ? start : end;
      const finalEnd = start <= end ? end : start;
      persistAndBroadcast(finalStart, finalEnd);
    },
    [persistAndBroadcast]
  );

  const handleSetStartDate = useCallback(
    (date: string) => {
      if (!date || date.length !== 10) return;
      const currentEnd = endDateRef.current;
      const nextEnd = currentEnd && date > currentEnd ? date : currentEnd || date;
      persistAndBroadcast(date, nextEnd);
    },
    [persistAndBroadcast]
  );

  const handleSetEndDate = useCallback(
    (date: string) => {
      if (!date || date.length !== 10) return;
      const currentStart = startDateRef.current;
      const nextStart = currentStart && date < currentStart ? date : currentStart || date;
      persistAndBroadcast(nextStart, date);
    },
    [persistAndBroadcast]
  );

  const handleSetStartMonth = useCallback(
    (month: string) => {
      if (!month || month.length !== 7) return;
      handleSetStartDate(`${month}-01`);
    },
    [handleSetStartDate]
  );

  const handleSetEndMonth = useCallback(
    (month: string) => {
      if (!month || month.length !== 7) return;
      const [ey, em] = month.split('-').map(Number);
      const lastDay = new Date(ey, em, 0).getDate();
      handleSetEndDate(`${month}-${String(lastDay).padStart(2, '0')}`);
    },
    [handleSetEndDate]
  );

  return (
    <DateFilterContext.Provider
      value={{
        startDate,
        setStartDate: handleSetStartDate,
        endDate,
        setEndDate: handleSetEndDate,
        setDateRange: handleSetDateRange,
        startMonth,
        setStartMonth: handleSetStartMonth,
        endMonth,
        setEndMonth: handleSetEndMonth,
        isMounted,
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
      setDateRange: () => {},
      startMonth: cur.startMonth,
      setStartMonth: () => {},
      endMonth: cur.endMonth,
      setEndMonth: () => {},
      isMounted: true,
    };
  }
  return context;
}
