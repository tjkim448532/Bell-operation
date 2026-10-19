import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "레져본부 팀장용",
  description: "벨포레 레저사업본부 팀장 운영 실적 & 비용 리포트",
};

export default function TeamReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
