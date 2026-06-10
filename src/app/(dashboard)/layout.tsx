import Sidebar from '@/components/Sidebar';
import { DateFilterProvider } from '@/context/DateFilterContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateFilterProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </DateFilterProvider>
  );
}
