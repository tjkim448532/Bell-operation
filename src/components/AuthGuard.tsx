"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// 관리자 권한이 반드시 필요한 데이터 관리 및 수정 경로
const ADMIN_ONLY_PREFIXES = [
  '/upload',
  '/validation',
  '/petforet',
  '/venue-analytics',
  '/venue-pnl',
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    // 관리자 전용 경로일 때만 비로그인 접근 차단 및 로그인 페이지 이동
    if (isAdminOnly && !loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAdminOnly, user, loading, router, pathname]);

  // 관리자 전용 경로 접근 시에만 로딩 스피너 및 로그인 가드 실행
  if (isAdminOnly) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#00AE95]"></div>
        </div>
      );
    }

    if (!user) {
      return null; // Will redirect in useEffect
    }
  }

  // 일반 열람 경로(실적 분석, 레저본부 운영·분석, 팀장 공유 리포트 등)는 비로그인으로 자유롭게 통과
  return <>{children}</>;
}

