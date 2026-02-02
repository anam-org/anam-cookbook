"use client";

import { useAnam } from "@/providers/AnamProvider";

export function AvatarOverlay() {
  const { connectionState, error, lastToolCall, startSession, stopSession } =
    useAnam();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {/* Tool call feedback */}
      {lastToolCall && (
        <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm shadow-lg">
          {lastToolCall}
        </div>
      )}

      {/* Avatar container */}
      <div className="w-80 bg-black rounded-lg overflow-hidden shadow-xl">
        <div className="relative aspect-[3/2]">
          <video
            id="avatar-video"
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {connectionState === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <button
                onClick={startSession}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start conversation
              </button>
            </div>
          )}

          {connectionState === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-white">Connecting...</div>
            </div>
          )}

          {connectionState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4 p-4">
              <div className="text-red-400 text-sm text-center">{error}</div>
              <button
                onClick={startSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {connectionState === "connected" && (
            <button
              onClick={stopSession}
              className="absolute top-2 right-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              End
            </button>
          )}
        </div>

        {connectionState === "connected" && (
          <p className="text-gray-400 text-xs text-center py-2 px-4">
            Try: &quot;Show me the pricing page&quot;
          </p>
        )}
      </div>
    </div>
  );
}
