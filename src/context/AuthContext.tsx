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
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    if (!allowedEmailsStr) {
      // If no env var is set, for safety, let's reject everyone unless configured.
      // Alternatively, we can allow everyone. Since the user requested restriction, 
      // let's return false unless they configure it.
      console.warn("NEXT_PUBLIC_ALLOWED_EMAILS is not set. All logins will be rejected until configured.");
      return false;
    }
    const allowedEmails = allowedEmailsStr.split(",").map(e => e.trim().toLowerCase());
    return allowedEmails.includes(email.toLowerCase());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!checkAllowedEmail(currentUser.email)) {
          // Unallowed user, sign them out immediately
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
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAllowedUser: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
