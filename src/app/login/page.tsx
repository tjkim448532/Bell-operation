"use client";

import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Loader2, Sparkles, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      if (!auth || !googleProvider) {
        throw new Error("파이어베이스 설정이 누락되었습니다. Vercel 환경 변수(Environment Variables)를 확인하고 재배포해주세요.");
      }

      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSigningIn(false);
    }
  };

  if (user || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#00AE95]" />
        <span className="text-sm font-semibold text-slate-500 tracking-tight">인증 상태 확인 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] relative overflow-hidden">
      {/* Geometric Decorative Elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00AE95]/10 rounded-[50%_50%_0_0] rotate-45 pointer-events-none blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#00AE95]/10 rounded-[50%_0_50%_0] pointer-events-none blur-2xl" />
      <div className="absolute top-1/3 left-10 w-32 h-32 bg-[#00AE95]/5 rounded-full pointer-events-none blur-xl" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        {/* Brand Logo */}
        <div className="w-18 h-18 rounded-[24px] bg-[#00AE95] text-white flex items-center justify-center font-black text-4xl shadow-[0_12px_30px_rgba(0,174,149,0.3)] mx-auto">
          B
        </div>
        
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            BELL-OPP
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            벨포레 레저본부 전용 통합 운영·재무 통제 센터
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-8 sm:p-10 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          {/* Micro Mint Glow Circle */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#00AE95]/5 rounded-full blur-xl group-hover:scale-[1.8] transition-transform duration-500 pointer-events-none" />

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-semibold">
              <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-rose-500" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center space-y-1 pb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00AE95]/10 text-[#00AE95] text-2xs font-extrabold">
                <ShieldCheck size={13} />
                <span>관리자 전용 보안 인증</span>
              </div>
              <p className="text-xs text-slate-400">
                허가된 본부 관리자 Google 계정으로 로그인해 주세요.
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#00AE95] hover:bg-[#009b84] shadow-[0_8px_20px_rgba(0,174,149,0.25)] focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-98"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Google 계정으로 로그인</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-8 text-center text-2xs text-slate-400 font-medium">
            비인가자의 접근은 엄격히 통제되며 모든 접속 이력은 기록됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
