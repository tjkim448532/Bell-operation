import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "BELL-OPP",
  description: "벨포레 레저본부 대시보드",
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
