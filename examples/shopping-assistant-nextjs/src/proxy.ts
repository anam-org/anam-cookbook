import { NextResponse, type NextRequest } from "next/server";

// Gives every visitor a cart ID on their first request, before any page or
// API route runs. Every request after that carries the same ID, so two adds
// at once can't each create a different cart.

const COOKIE = "cart";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function proxy(request: NextRequest) {
  if (UUID.test(request.cookies.get(COOKIE)?.value ?? "")) return NextResponse.next();
  const id = crypto.randomUUID();
  // Set it on the request too, so this request's route sees the same ID.
  request.cookies.set(COOKIE, id);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export const config = {
  // Pages and API routes, not Next.js's own files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
