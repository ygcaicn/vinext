---
name: migrate-to-vinext
description: Migrate a Next.js project to vinext (Vite-based Next.js reimplementation). Use when asked to "migrate to vinext", "switch to vinext", "convert to vinext", "upgrade to vinext", "replace next with vinext".
author: Cloudflare
---

# Migrate Next.js to vinext

vinext is a clean reimplementation of the Next.js API surface on Vite. Existing `app/`, `pages/`, `next.config.js`, and `next/*` imports all work as-is.

## Step 0: Confirm This Is a Next.js Project

Before starting the migration, verify the project actually uses Next.js:

1. Check `package.json` for `next` in `dependencies` or `devDependencies`
2. Confirm the project has an `app/` directory (App Router) and/or `pages/` directory (Pages Router)
3. Look for `next.config.js`, `next.config.ts`, or `next.config.mjs`

If `next` is not in the dependencies, **stop** — this skill is only for migrating existing Next.js projects. If the user wants to start a new vinext project from scratch, point them to the vinext docs instead.

## Step 1: Check Compatibility

Run the compatibility scanner to identify potential issues before migrating:

```shell
npx vinext check
```

Review any warnings. Most Next.js projects work without changes, but the check will flag:
- Unsupported config options (e.g., `webpack` config — use Vite plugins instead)
- Deprecated APIs
- Known incompatibilities with third-party libraries

If the compatibility score is below 70%, review the unsupported items with the user before proceeding. Some issues (like `webpack` config) require manual porting to Vite plugins.

## Step 2: Run the Migration

Use `vinext init` to automate the migration:

```shell
npx vinext init
```

This command:
1. Installs `vite` and `@vitejs/plugin-rsc` (for App Router) as devDependencies
2. Renames CJS config files (e.g., `postcss.config.js` -> `.cjs`) to avoid ESM conflicts
3. Adds `"type": "module"` to `package.json` if needed
4. Adds `dev:vinext` and `build:vinext` scripts alongside existing scripts
5. Generates a minimal `vite.config.ts`

The migration is **non-destructive** — your existing Next.js setup continues to work alongside vinext.

Options:
- `--force` — Overwrite existing `vite.config.ts`
- `--skip-check` — Skip the compatibility scan
- `--port <port>` — Set dev server port (default: 3001)

## Step 3: Run the Dev Server

Start the vinext dev server:

```shell
npm run dev:vinext    # Runs on port 3001 by default
npm run dev           # Still runs Next.js as before
```

Confirm the server starts and pages render correctly.

## Step 4: Build and Deploy (Optional)

For production builds:

```shell
npm run build:vinext  # or: vinext build
```

To deploy to Cloudflare Workers:

```shell
vinext deploy
```

The deploy command auto-generates `wrangler.jsonc` and worker entry if needed.

## CLI Reference

| Command | Description |
|---------|-------------|
| `vinext dev` | Development server with HMR |
| `vinext build` | Production build |
| `vinext start` | Local production server (for testing) |
| `vinext deploy` | Build and deploy to Cloudflare Workers |
| `vinext init` | Migrate a Next.js project |
| `vinext check` | Scan for compatibility issues |

## What Works As-Is

- `app/` and `pages/` directories
- `next.config.js` / `.ts` / `.mjs`
- All `next/*` imports (`next/link`, `next/image`, `next/font`, `next/navigation`, etc.)
- `public/` static assets
- Server Components and `"use client"` / `"use server"` directives
- Middleware (`middleware.ts`)
- API routes and route handlers

## What Requires Vite Equivalents

| Next.js | vinext Equivalent |
|---------|-------------------|
| `webpack` config | Vite plugins |
| `next/jest` | Vitest |
| Turbopack config | Vite config |
