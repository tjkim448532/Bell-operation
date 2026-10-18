"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAllowedUser: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  isAllowedUser: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // You can set allowed emails in your environment variables separated by commas
  // e.g., NEXT_PUBLIC_ALLOWED_EMAILS=admin1@gmail.com,admin2@gmail.com
  // If not set, it defaults to allowing any email (or you can strict it by default).
  // We'll be strict if the env var is set, or if we hardcode values here.
  const checkAllowedEmail = (email: string | null) => {
    if (!email) return false;
    let allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    if (!allowedEmailsStr) {
      // If no env var is set, for safety, let's reject everyone unless configured.
      // Alternatively, we can allow everyone. Since the user requested restriction, 
      // let's return false unless they configure it.
      console.warn("NEXT_PUBLIC_ALLOWED_EMAILS is not set. All logins will be rejected until configured.");
      return false;
    }
    allowedEmailsStr = allowedEmailsStr.replace(/["']/g, ""); // Remove quotes
    const allowedEmails = allowedEmailsStr.split(",").map(e => e.trim().toLowerCase());
    return allowedEmails.includes(email.toLowerCase());
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!checkAllowedEmail(currentUser.email)) {
          // Unallowed user, sign them out immediately
          // 전역에서 alert을 띄우면 비로그인으로 팀장 리포트를 열람하는 사용자에게도 방해되므로,
          // /login 페이지에서 관리자 로그인을 시도했을 때만 경고를 표출하고 그 외에는 조용히 게스트 상태로 전환
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            alert(`접근 권한이 없는 관리자 계정입니다: ${currentUser.email}\n관리자 승인된 계정으로 다시 시도해주세요.`);
          }
          await signOut(auth);
          setUser(null);
        } else {
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAllowedUser: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
