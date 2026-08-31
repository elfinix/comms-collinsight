import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://snsqkogfrrtyloqetowx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuc3Frb2dmcnJ0eWxvcWV0b3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTcwNTYsImV4cCI6MjEwMzM3MzA1Nn0.9dRlq27ExLNQt_HZqgdrFto0LYzPK62fm1KTTQrqgMI";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
