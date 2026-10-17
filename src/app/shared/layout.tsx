import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import { DateFilterProvider } from '@/context/DateFilterContext';

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateFilterProvider>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden print:h-auto print:overflow-visible">
        <Suspense fallback={<aside className="w-64 shrink-0 h-screen border-r border-slate-200 bg-white print:hidden" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC] print:overflow-visible print:bg-white">
          {children}
        </main>
      </div>
    </DateFilterProvider>
  );
}
