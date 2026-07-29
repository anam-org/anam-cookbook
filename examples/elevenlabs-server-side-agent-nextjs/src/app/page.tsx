import ConversationView from "@/components/ConversationView";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      {/* Content section */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 py-4 sm:py-8 gap-2 sm:gap-3">
        <ConversationView
          personaName={process.env.PERSONA_NAME || "ElevenLabs Agent"}
          avatarId={process.env.ANAM_AVATAR_ID ?? ""}
          agentId={process.env.ELEVENLABS_AGENT_ID ?? ""}
        />
      </div>
    </main>
  );
}
