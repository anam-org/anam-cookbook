import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="flex gap-4 mb-8 text-sm">
          <Link href="/" className="text-blue-600 font-medium">
            Home
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/features" className="text-gray-600 hover:text-gray-900">
            Features
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900">
            Contact
          </Link>
        </nav>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Our Site
          </h1>
          <p className="text-gray-600">
            This demo shows how Anam avatars can control your application using
            client-side tools. The avatar can navigate between pages based on
            voice commands.
          </p>
          <p className="text-gray-600">
            Ask the avatar to show you the pricing page, features, or contact
            information. The avatar stays active as you navigate between pages.
          </p>
        </div>
      </div>
    </main>
  );
}
