import { redirect } from 'next/navigation';

export default async function VenueExpenseAnalyticsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams?.tab ? `&tab=${searchParams.tab}` : '';
  redirect(`/?slide=2${tab}`);
}
