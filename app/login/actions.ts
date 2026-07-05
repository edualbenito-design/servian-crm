"use server";

import { redirect } from "next/navigation";
import { ssrClient } from "@/lib/supabase/ssr";

export async function signIn(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return "Please enter your email and password.";

  const supabase = await ssrClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return "Incorrect email or password.";

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await ssrClient();
  await supabase.auth.signOut();
  redirect("/login");
}
