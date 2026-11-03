import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
});

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
    <html lang="ko" className={notoSansKr.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap"
        />
      </head>
      <body
        className={`${notoSansKr.className} min-h-screen bg-slate-50 font-sans text-slate-900 leading-[1.6] tracking-[-0.02em] antialiased selection:bg-blue-600 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
