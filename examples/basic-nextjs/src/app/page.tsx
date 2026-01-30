import { PersonaPlayer } from "@/components/PersonaPlayer";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Anam Persona Demo
        </h1>
        <p className="text-gray-600 mb-8">
          Click the button below to start a conversation with an AI persona.
          Speak using your microphone to chat.
        </p>

        <PersonaPlayer />
      </div>
    </main>
  );
}
