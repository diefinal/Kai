import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { APP_CONFIG } from "@/lib/constants";

const secretKey = new TextEncoder().encode(APP_CONFIG.jwtSecret);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // 1. Ana Domain (teknoreha.com ve www.teknoreha.com) için Root Rewrite Mantığı
  if (hostname === "teknoreha.com" || hostname === "www.teknoreha.com") {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/musteri", request.url));
    }
  }

  // 2. App Domain (app.teknoreha.com veya genel kök '/') -> Doğrudan /yonetim Paneline Yönlendirme
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/yonetim", request.url));
  }

  // 3. Admin API Endpoint Koruması (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get(APP_CONFIG.authCookieName)?.value;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim. Giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    try {
      await jwtVerify(token, secretKey);
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { success: false, error: "Geçersiz veya süresi dolmuş oturum." },
        { status: 401 }
      );
    }
  }

  // 4. Yönetim Paneli Sayfa Koruması (/yonetim/*)
  if (pathname.startsWith("/yonetim")) {
    const cookieToken = request.cookies.get(APP_CONFIG.authCookieName)?.value;

    if (!cookieToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(cookieToken, secretKey);
      return NextResponse.next();
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
