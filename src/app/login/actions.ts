"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signAuthToken, verifyPassword } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/").trim() || "/";
  if (!verifyPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const token = await signAuthToken({ v: 1, iat: Date.now() });
  const jar = await cookies();
  jar.set("app_auth", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  redirect(nextPath);
}

export async function logout() {
  const jar = await cookies();
  jar.set("app_auth", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  redirect("/login");
}
