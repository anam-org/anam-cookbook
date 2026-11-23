import { connection } from "next/server";
import ConversationView from "@/components/ConversationView";
import { readServerConfig } from "@/lib/session-auth";

export default async function Home() {
  // Read the settings at request time rather than at build time.
  await connection();

  // The avatar and agent IDs stay on the server. The page only tells the
  // browser whether the server is configured.
  const isConfigured = readServerConfig() !== null;

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Content section */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 py-4 sm:py-8 gap-2 sm:gap-3">
        <ConversationView
          personaName={process.env.PERSONA_NAME || "ElevenLabs Agent"}
          isConfigured={isConfigured}
        />
      </div>
    </main>
  );
}
