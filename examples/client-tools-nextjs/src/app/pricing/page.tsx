import Link from "next/link";
import { ClientToolsPlayer } from "@/components/ClientToolsPlayer";

export default function Pricing() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="flex gap-4 mb-8 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Home
          </Link>
          <Link href="/pricing" className="text-blue-600 font-medium">
            Pricing
          </Link>
          <Link href="/features" className="text-gray-600 hover:text-gray-900">
            Features
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900">
            Contact
          </Link>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Pricing</h1>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-6 bg-white rounded-lg border">
                <h2 className="text-xl font-semibold text-gray-900">Starter</h2>
                <p className="text-3xl font-bold mt-2">$29/mo</p>
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li>100 sessions/month</li>
                  <li>Basic analytics</li>
                  <li>Email support</li>
                </ul>
              </div>

              <div className="p-6 bg-white rounded-lg border border-blue-500">
                <h2 className="text-xl font-semibold text-gray-900">Pro</h2>
                <p className="text-3xl font-bold mt-2">$99/mo</p>
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li>Unlimited sessions</li>
                  <li>Advanced analytics</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
          </div>

          <ClientToolsPlayer />
        </div>
      </div>
    </main>
  );
}
