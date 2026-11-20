"use server";

import { createStartTicket, readServerConfig } from "@/lib/session-auth";

/**
 * Signs a start ticket just before the browser calls /api/anam-session.
 * Next.js only runs server actions for same-origin requests, and the ticket
 * is signed with SESSION_SECRET, which never leaves the server.
 */
export async function getStartTicket() {
  return readServerConfig() ? createStartTicket() : null;
}
