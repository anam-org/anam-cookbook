import { NextRequest } from "next/server";
import { verifyPresignedUrl } from "./presign";

export function authenticateWebhook(req: NextRequest, routePath: string): string {
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("PUBLIC_BASE_URL not set");
  const baseUrl = `${base}${routePath}`;

  const params = req.nextUrl.searchParams;
  return verifyPresignedUrl(
    baseUrl,
    params.get("uid"),
    params.get("exp"),
    params.get("sig"),
  );
}
