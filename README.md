# Anam Cookbook

Recipes and examples for building conversational AI experiences with [Anam](https://anam.ai) avatars.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

Open [http://localhost:3000](http://localhost:3000) to view the cookbook.

## Adding Recipes

Create a new `.mdx` file in `content/recipes/`:

```mdx
---
title: Your Recipe Title
description: A brief description of what this recipe covers.
tags: [javascript, turnkey, beginner]
difficulty: beginner  # beginner | intermediate | advanced
sdk: javascript       # javascript | python | react | react-native
date: 2025-01-19
author: Your Name
---

# Your Recipe Title

Recipe content goes here...
```

### Available Tags

**Integration**: `turnkey`, `byo-llm`, `byo-stt`, `livekit`, `agora`

**Use Case**: `customer-support`, `sales`, `education`, `healthcare`

**SDK**: `javascript`, `python`, `react`, `react-native`

**Feature**: `rag`, `tools`, `interruption`, `multilingual`

### MDX Components

Use these components in your recipes:

```mdx
<Tip>Helpful tips for the reader</Tip>

<Warning>Important warnings or caveats</Warning>

<Info>Additional context or information</Info>
```

## Project Structure

```
anam-cookbook/
├── app/                    # Next.js app router
│   ├── page.tsx            # Homepage with recipe grid
│   └── [slug]/page.tsx     # Individual recipe pages
├── components/             # React components
│   ├── RecipeCard.tsx
│   ├── TagFilter.tsx
│   └── mdx/                # MDX rendering components
├── content/
│   └── recipes/            # MDX recipe files
├── lib/
│   ├── recipes.ts          # Recipe loading utilities
│   └── shiki.ts            # Syntax highlighting
└── public/                 # Static assets
```

## License

MIT
