"use server";

import { createStartTicket, readServerConfig } from "@/lib/session-auth";

/**
 * Signs a start ticket just before the browser calls /api/anam-session.
 *
 * Next.js rejects a server action whose Origin header names another host, so
 * other websites can't get tickets from their visitors' browsers. A request
 * with no Origin header, such as one from a script, still gets a ticket. The
 * ticket deters cross-site use; it isn't authentication, which is why the
 * route also rate-limits starts.
 */
export async function getStartTicket() {
  return readServerConfig() ? createStartTicket() : null;
}
