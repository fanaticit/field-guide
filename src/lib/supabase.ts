// ─────────────────────────────────────────────────────────────
// Supabase client singleton
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from env.
//
// Setup:
//   1. Create a .env.local file at project root with:
//        VITE_SUPABASE_URL=https://<ref>.supabase.co
//        VITE_SUPABASE_ANON_KEY=<your-anon-key>
//   2. Both values are in Supabase Dashboard → Project Settings → API
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Create a .env.local file with:\n' +
      '  VITE_SUPABASE_URL=https://<ref>.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=<anon-key>'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage so the user stays logged in on refresh
    persistSession: true,
    // Automatically refresh the token before it expires
    autoRefreshToken: true,
    // Detect OAuth code in the URL on the redirect-back page
    detectSessionInUrl: true,
  },
});

export default supabase;
