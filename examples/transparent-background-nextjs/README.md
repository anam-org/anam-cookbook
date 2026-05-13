# Transparent backgrounds with canvas green-screen keying

This example shows how to composite an Anam avatar into your own page by creating a custom avatar from a green-screen image, streaming it into a hidden video element, and drawing keyed frames into a transparent canvas.

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Add your `ANAM_API_KEY`, then create a custom avatar from the included green-screen source image:

```bash
pnpm create-avatar
```

The script defaults to `cara-4-latest`. You can also set it explicitly:

```bash
ANAM_AVATAR_MODEL=cara-4-latest pnpm create-avatar
```

Copy the printed `ANAM_AVATAR_ID=...` value into `.env.local`.

Text-to-image tools like Nano Banana work well for replacing an existing portrait background with green. Ask for no green spill on the person or around the border; otherwise they can add green edge glow that looks like real green-screen spill and is harder to key cleanly.

## Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), start the conversation, and the hidden Anam video stream will be keyed into the canvas layer.

## How it works

- `scripts/create-avatar.mjs` calls `POST https://api.anam.ai/v1/avatars` with multipart form data.
- `src/app/api/session-token/route.ts` creates an Anam session token with your green-screen avatar.
- `src/components/GreenScreenCanvas.tsx` reads the hidden video element, removes green pixels, softens edges, and draws the result into a transparent canvas.
- `src/components/TransparentAvatarExperience.tsx` places the keyed canvas directly over a page background and listens for a client tool that can switch scenes.
