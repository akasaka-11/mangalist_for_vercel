import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Both values are public by design: the anon key only allows what Row Level
// Security policies allow. Never put the service_role key in the frontend.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** null when the env variables are missing (e.g. a fresh clone without .env.local). */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
