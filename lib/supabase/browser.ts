import { createBrowserClient } from "@supabase/ssr";

// Supabase client for use in the browser (Client Components).
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
