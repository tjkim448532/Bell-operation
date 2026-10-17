"use client";

import React from 'react';
import { DateProvider } from '@/contexts/DateContext';
import { CoreDataProvider } from '@/contexts/CoreDataContext';

export default function LeisureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateProvider>
      <CoreDataProvider>
        {children}
      </CoreDataProvider>
    </DateProvider>
  );
}
