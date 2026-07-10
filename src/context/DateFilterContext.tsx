'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type DateFilterContextType = {
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
};

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const savedMonth = localStorage.getItem('globalMonth');
    if (savedMonth) {
      setCurrentMonth(savedMonth);
    }
  }, []);

  const handleSetMonth = (month: string) => {
    setCurrentMonth(month);
    localStorage.setItem('globalMonth', month);
  };

  return (
    <DateFilterContext.Provider 
      value={{ 
        currentMonth, 
        setCurrentMonth: handleSetMonth 
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
