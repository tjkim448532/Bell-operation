import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
