import { connection } from "next/server";
import ConversationView from "@/components/ConversationView";
import { createStartTicket, readServerConfig } from "@/lib/session-auth";

export default async function Home() {
  // Render on every request, so each visitor gets a fresh start ticket.
  await connection();

  // The avatar and agent IDs stay on the server. The browser gets only a
  // signed ticket that lets it start a conversation through /api/anam-session.
  const isConfigured = readServerConfig() !== null;
  const startTicket = isConfigured ? createStartTicket() : null;

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Content section */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 py-4 sm:py-8 gap-2 sm:gap-3">
        <ConversationView
          personaName={process.env.PERSONA_NAME || "ElevenLabs Agent"}
          startTicket={startTicket}
        />
      </div>
    </main>
  );
}
