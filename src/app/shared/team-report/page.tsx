import TeamReport from '@/components/TeamReport';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '레저본부',
};

export default function SharedTeamReportPage() {
  return <TeamReport isShared={true} />;
}
