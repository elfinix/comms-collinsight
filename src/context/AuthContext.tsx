import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, users as fallbackUsers, formatUserRole } from "../services/dataService";
import { supabase } from "../services/supabaseClient";
import { mapUserFromDb, supabaseApi } from "../services/supabaseService";

export function getDefaultDashboardPath(role?: string): string {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "adviser":
      return "/adviser/dashboard";
    case "dean":
      return "/dean/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/";
  }
}

interface AuthContextType {
  currentUser: User | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "collinsight_current_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    setIsAuthLoading(false);
  }, []);

  // Sync to both localStorage (for multi-tab persistence) and sessionStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [currentUser]);

  // Real-time listener for cross-tab login/logout synchronization
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        try {
          if (e.newValue) {
            const parsedUser = JSON.parse(e.newValue);
            setCurrentUser(parsedUser);
          } else {
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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
      localStorage.removeItem(STORAGE_KEY);
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
    <AuthContext.Provider value={{ currentUser, isAuthLoading, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

