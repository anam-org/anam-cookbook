import Link from "next/link";
import { ClientToolsPlayer } from "@/components/ClientToolsPlayer";

export default function Features() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="flex gap-4 mb-8 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Home
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/features" className="text-blue-600 font-medium">
            Features
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900">
            Contact
          </Link>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Features</h1>

            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border">
                <h2 className="font-semibold text-gray-900">
                  Voice-Controlled Navigation
                </h2>
                <p className="text-gray-600 mt-1">
                  Users can navigate your app using natural voice commands.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <h2 className="font-semibold text-gray-900">
                  Real-time Responses
                </h2>
                <p className="text-gray-600 mt-1">
                  The avatar responds instantly to user requests.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <h2 className="font-semibold text-gray-900">
                  Seamless Integration
                </h2>
                <p className="text-gray-600 mt-1">
                  Works with any React application using the Anam SDK.
                </p>
              </div>
            </div>
          </div>

          <ClientToolsPlayer />
        </div>
      </div>
    </main>
  );
}
