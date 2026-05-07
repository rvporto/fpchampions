import { createClient } from "@supabase/supabase-js"; 


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://sgbuvlqmbdtfojmwwwyq.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYnV2bHFtYmR0Zm9qbXd3d3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTM1MzgsImV4cCI6MjA5MzM4OTUzOH0.aoY9YWsaqW1WuV8RHT1SG1zQcv7GOn2IG1sEBdSHv3c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

