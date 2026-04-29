import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const hasConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasConfig) {
  console.warn('Supabase credentials missing. The application will run in degraded mode.');
}

export const supabase = hasConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');
export const isSupabaseConfigured = hasConfig;
