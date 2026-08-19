import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PostHogProvider } from '@/components/PostHogProvider';
import { PostHogPageView } from '@/components/PostHogPageView';
import { Header } from '@/components/Header';
import { Attribution } from '@/components/Attribution';
import { CookieConsent } from '@/components/CookieConsent';
import { getAllRecipes } from '@/lib/recipes';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Anam Cookbook: AI Avatar Tutorials & Integration Guides',
  description: 'Tutorials and code examples for building with real-time AI avatars. Integrate Anam with Next.js, LiveKit, ElevenLabs, Python, Shopify, and more.',
  metadataBase: new URL('https://anam.ai/cookbook'),
  alternates: {
    canonical: 'https://anam.ai/cookbook',
  },
  openGraph: {
    title: 'Anam Cookbook: AI Avatar Tutorials & Integration Guides',
    description: 'Tutorials and code examples for building with real-time AI avatars. Integrate Anam with Next.js, LiveKit, ElevenLabs, Python, Shopify, and more.',
    url: 'https://anam.ai/cookbook',
    siteName: 'Anam Cookbook',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anam Cookbook: AI Avatar Tutorials & Integration Guides',
    description: 'Tutorials and code examples for building with real-time AI avatars. Integrate Anam with Next.js, LiveKit, ElevenLabs, Python, Shopify, and more.',
  },
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script id="anam-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
            window.gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
            window.gtag('set', 'url_passthrough', true);
            try {
              var match = document.cookie.match(/(?:^|; )anam_cookie_consent=([^;]*)/);
              if (match) {
                var parts = decodeURIComponent(match[1]).split('.');
                if (parts[0] === 'v1' && parts.length === 3) {
                  window.gtag('consent', 'update', {
                    analytics_storage: parts[1] === '1' ? 'granted' : 'denied',
                    ad_storage: parts[2] === '1' ? 'granted' : 'denied',
                    ad_user_data: parts[2] === '1' ? 'granted' : 'denied',
                    ad_personalization: parts[2] === '1' ? 'granted' : 'denied'
                  });
                }
              }
            } catch (error) {}
          `}
        </Script>
        <Script id="anam-gtm" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PLGBR5JN');
          `}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Prevent transitions on initial load
                  document.documentElement.classList.add('theme-transitioning');

                  const theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
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
                background-color: #202122;
                color-scheme: dark;
              }
              html:not(.dark) {
                background-color: #F5F5F5;
                color-scheme: light;
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <PostHogProvider>
          <Attribution />
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <ThemeProvider defaultTheme="dark">
            <Header recipes={recipes} />
            <main className="flex-1">{children}</main>
            <Footer />
          </ThemeProvider>
        </PostHogProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
