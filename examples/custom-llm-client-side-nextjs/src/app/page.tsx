import { CustomLLMPlayer } from "@/components/CustomLLMPlayer";

export default function Home() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Custom LLM with Anam (client-side)
        </h1>
        <p className="text-gray-600">
          This demo uses a custom language model (GPT-4o-mini via API route)
          while Anam handles speech-to-text, text-to-speech, and avatar rendering.
        </p>
        <CustomLLMPlayer />
      </div>
    </main>
  );
}
