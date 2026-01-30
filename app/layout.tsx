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
  description: 'Cookbooks and examples for building with Anam AI avatars',
};

function Footer() {
  return (
    <footer className="border-t border-slate-200/60 dark:border-neutral-700/50 bg-[#F5F5F5] dark:bg-[#202122] mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-neutral-400">
          <p>&copy; {new Date().getFullYear()} Anam AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="https://anam.ai" className="hover:text-slate-700 dark:hover:text-neutral-200 active:text-slate-900 dark:active:text-neutral-100 motion-safe:transition-colors motion-reduce:transition-none">
              anam.ai
            </Link>
            <Link href="https://lab.anam.ai" className="hover:text-slate-700 dark:hover:text-neutral-200 active:text-slate-900 dark:active:text-neutral-100 motion-safe:transition-colors motion-reduce:transition-none">
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
                  // Prevent transitions on initial load
                  document.documentElement.classList.add('theme-transitioning');

                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.style.colorScheme = 'light';
                  }

                  // Re-enable transitions after initial render
                  setTimeout(() => {
                    document.documentElement.classList.remove('theme-transitioning');
                  }, 0);
                } catch (e) {}
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                background-color: #F5F5F5;
                color-scheme: light;
              }
              html.dark {
                background-color: #202122;
                color-scheme: dark;
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ThemeProvider defaultTheme="light">
          <Header recipes={recipes} />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
