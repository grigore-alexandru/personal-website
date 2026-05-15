import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Untyped client for legacy service files — allows any table/column access without strict inference
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
