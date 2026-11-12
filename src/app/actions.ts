"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAppMode } from "@/lib/env";
import { supabase } from "@/lib/server/supabase";
export async function signOutAction() {
  if (getAppMode() === "live") {
    const db = await supabase();
    const { error } = await db.auth.signOut();
    if (error) throw new Error("Sign out failed. Please retry.");
    (await cookies()).delete("leadpilot.organization");
  }
  redirect("/login");
}
