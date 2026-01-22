import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Header } from '@/components/Header';
import { getAllRecipes } from '@/lib/recipes';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Anam Cookbook',
  description: 'Recipes and examples for building with Anam AI avatars',
};

function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-neutral-400">
          <p>&copy; {new Date().getFullYear()} Anam AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="https://anam.ai" className="hover:text-slate-700 dark:hover:text-neutral-200 transition-colors">
              anam.ai
            </Link>
            <Link href="https://lab.anam.ai" className="hover:text-slate-700 dark:hover:text-neutral-200 transition-colors">
              Anam Lab
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const recipes = getAllRecipes();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ThemeProvider defaultTheme="dark">
          <Header recipes={recipes} />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
