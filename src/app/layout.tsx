import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "벨포레 레져본부 실적 및 손익 관리",
  description: "벨포레 레져본부 통합 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans text-slate-800 bg-[#F8FAFC] selection:bg-[#00AE95]/20 selection:text-[#00AE95] tracking-tight">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
