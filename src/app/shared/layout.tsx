import { DateFilterProvider } from '@/context/DateFilterContext';

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateFilterProvider>
      <div className="min-h-screen bg-gray-50 p-8">
        {children}
      </div>
    </DateFilterProvider>
  );
}
