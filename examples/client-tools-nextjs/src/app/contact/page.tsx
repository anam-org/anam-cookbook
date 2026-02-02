import Link from "next/link";

export default function Contact() {
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
          <Link href="/features" className="text-gray-600 hover:text-gray-900">
            Features
          </Link>
          <Link href="/contact" className="text-blue-600 font-medium">
            Contact
          </Link>
        </nav>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>

          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="text-gray-900">hello@example.com</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <p className="text-gray-900">+1 (555) 123-4567</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <p className="text-gray-900">
                  123 Main Street
                  <br />
                  San Francisco, CA 94102
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
