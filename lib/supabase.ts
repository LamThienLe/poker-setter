import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// NEXT_PUBLIC_ values are inlined into the bundle at build time, not read at
// runtime, so these have to be present when `next build` runs — on Railway
// that means the service variables, not just the running container.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "For local development, copy .env.example to .env.local and fill it in. " +
      "For deploys, set both in the Railway service variables before building."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
