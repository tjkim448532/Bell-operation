import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import { DateFilterProvider } from '@/context/DateFilterContext';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DateFilterProvider>
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
          <Suspense fallback={<aside className="w-64 shrink-0 h-screen border-r border-slate-200 bg-white" />}>
            <Sidebar />
          </Suspense>
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
            {children}
          </main>
        </div>
      </DateFilterProvider>
    </AuthGuard>
  );
}
