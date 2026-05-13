import { PauseResumePlayer } from "@/components/PauseResumePlayer";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Pause / Resume Demo
        </h1>
        <p className="text-gray-600 mb-8">
          Pause ends the current stream. Resume starts a fresh turnkey session
          and injects the previous transcript as context.
        </p>

        <PauseResumePlayer />
      </div>
    </main>
  );
}
