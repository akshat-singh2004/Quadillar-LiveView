import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://enjspjigocmjvfhlapku.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_55fOO3PWBG1GZZdgrcfTaw_giYdAl2a";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
