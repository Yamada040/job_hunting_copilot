import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL/Anon Key is missing. Check env.");
  }
  return { supabaseUrl, supabaseAnonKey };
};

export const createSupabaseServerReadonlyClient = async (): Promise<SupabaseClient> => {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
};

export const createSupabaseServerActionClient = async (): Promise<SupabaseClient> => {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
};

export const createSupabaseAdminClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL/Service Role Key is missing. Check env.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Backward-compatible aliases
export const createSupabaseServerClient = createSupabaseServerReadonlyClient;
export const createSupabaseReadonlyClient = createSupabaseServerReadonlyClient;
export const createSupabaseActionClient = createSupabaseServerActionClient;
