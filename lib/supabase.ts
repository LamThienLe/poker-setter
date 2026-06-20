import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nphpcbjkndhbzjjqmwru.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waHBjYmprbmRoYnpqanFtd3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTkyMDQsImV4cCI6MjA5NzUzNTIwNH0.SMuvktRVrab4xDvt2KX1pAKFRCDLadyF0Nrx9_Xo3oo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
