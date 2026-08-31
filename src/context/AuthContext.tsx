import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, users as fallbackUsers } from "../services/mockData";
import { supabase } from "../services/supabaseClient";
import { mapUserFromDb, supabaseApi } from "../services/supabaseService";

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "collinsight_current_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [currentUser]);

  async function login(email: string, password: string): Promise<boolean> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Direct Live Supabase Lookup
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", trimmedEmail)
        .eq("password", trimmedPass)
        .eq("deleted", false)
        .maybeSingle();

      if (!error && data) {
        const user = mapUserFromDb(data);
        setCurrentUser(user);
        return true;
      }
    } catch (err) {
      console.warn("Supabase login query failed, attempting local fallback:", err);
    }

    // 2. Fallback check
    const matched = fallbackUsers.find(
      (u) => u.email.toLowerCase() === trimmedEmail && u.password === trimmedPass && !u.deleted
    );

    if (matched) {
      setCurrentUser(matched);
      return true;
    }

    return false;
  }

  function logout() {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function updateCurrentUser(updates: Partial<User>) {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      (async () => {
        try {
          await supabaseApi.updateUser(prev.id, updates);
        } catch (err) {
          console.warn("Failed to persist user update to Supabase:", err);
        }
      })();
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
