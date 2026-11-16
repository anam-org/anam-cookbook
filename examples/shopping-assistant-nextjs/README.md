# Video shopping assistant

A small storefront with an Anam video assistant that searches the catalogue, answers from live prices and stock, and adds products to the shopper's cart. It uses the same pattern as Anam's Shopify app: a session token minted on the server for each call, a system prompt that says which page the shopper is on, and client tools that call the store's own endpoints in the shopper's browser.

The store is a made-up outdoor shop called Trailhead Supply with six products, product pages, and a cart kept in a cookie.

If you run a Shopify store, you don't need to build this: install [Anam: AI Shopping Assistant](https://apps.shopify.com/anam-video-assistant) from the Shopify App Store.

## Setup

You'll need Node.js 22 or later and pnpm 10 or later.

1. Copy `.env.example` to `.env.local` and add your Anam API key from [Anam Lab](https://lab.anam.ai):

```bash
cp .env.example .env.local
```

2. Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

3. Open [http://localhost:3000/products/trail-runner-shoe](http://localhost:3000/products/trail-runner-shoe), click **Talk to Mia** and allow microphone access. Try "Do you have any waterproof jackets?", then "Add this shoe in size 9, Moss." You can also type in the box under her video.

## How it works

- `src/config/assistant.ts` defines the four client tools, the system prompt and the greeting. `describePage()` turns the page path into a sentence for the prompt, using the catalogue on the server.
- `src/app/api/session-token/route.ts` checks the visitor's call limits and mints a session token with the persona config inline. The API key never reaches the browser.
- `src/lib/rate-limit.ts` caps calls per visitor and per store. The counts are in memory; use Redis or your database in production.
- `src/lib/shopping-tools.ts` handles the tools in the browser with `client.registerToolCallHandler()`. Each handler calls the store's API and returns text for the persona to read.
- `src/components/AssistantDock.tsx` starts and ends the call, shows the product cards, and tells the persona when the shopper opens another page.
- `src/lib/catalog.ts`, `src/lib/cart.ts` and the `api/products` and `api/cart` routes are the store itself.
