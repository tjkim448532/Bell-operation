import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '벨포레 인사(HR) 통합 자동화 시스템 | Belleforet HR Command Center',
  description:
    '벨포레 리조트 3개 법인(블랙스톤벨포레·KMG·락산수) 인사·급여·세무·4대보험 EDI·근태·식수·도급·법정기한 통합 자동화 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://hangeul.pstatic.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css"
        />
      </head>
      <body className="min-h-screen bg-slate-50 font-serif text-slate-900 leading-[1.65] tracking-[-0.02em] antialiased selection:bg-emerald-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
