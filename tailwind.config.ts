import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '75ch',
            'h1, h2, h3, h4': {
              fontWeight: '600',
              color: '#0f172a',
            },
            p: {
              color: '#475569',
            },
            li: {
              color: '#475569',
            },
            a: {
              color: '#2563eb',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            strong: {
              color: '#0f172a',
            },
            code: {
              backgroundColor: '#f1f5f9',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
        invert: {
          css: {
            'h1, h2, h3, h4': {
              color: '#fafafa',
            },
            p: {
              color: 'rgb(209, 213, 219)',
            },
            li: {
              color: 'rgb(209, 213, 219)',
            },
            a: {
              color: '#60a5fa',
            },
            strong: {
              color: '#e5e5e5',
            },
            code: {
              backgroundColor: 'rgb(38 38 38)',
              color: '#e5e5e5',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
