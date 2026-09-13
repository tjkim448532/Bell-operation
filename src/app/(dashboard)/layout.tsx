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
          <Sidebar />
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
            {children}
          </main>
        </div>
      </DateFilterProvider>
    </AuthGuard>
  );
}
