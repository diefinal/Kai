import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Çıkış yapıldı." });
  response.cookies.set({
    name: APP_CONFIG.authCookieName,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
