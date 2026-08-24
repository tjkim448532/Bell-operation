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
        <div className="flex h-screen bg-slate-50/50 overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
            {children}
          </main>
        </div>
      </DateFilterProvider>
    </AuthGuard>
  );
}
