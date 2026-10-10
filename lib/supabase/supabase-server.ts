import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase URL/Publishable Key is missing. Check env.");
  }
  return { supabaseUrl, supabasePublishableKey };
};

export const createSupabaseServerReadonlyClient = async (): Promise<SupabaseClient> => {
  const { supabaseUrl, supabasePublishableKey } = getEnv();
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
};

export const createSupabaseServerActionClient = async (): Promise<SupabaseClient> => {
  const { supabaseUrl, supabasePublishableKey } = getEnv();
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
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

// Backward-compatible aliases
export const createSupabaseServerClient = createSupabaseServerReadonlyClient;
export const createSupabaseReadonlyClient = createSupabaseServerReadonlyClient;
export const createSupabaseActionClient = createSupabaseServerActionClient;
