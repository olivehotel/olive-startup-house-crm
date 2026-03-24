# Olive Startup House CRM (Client)

Frontend-only CRM for Olive Startup House built with **React + Vite + TypeScript + Tailwind**, using **Supabase** for authentication.

## Requirements

- Node.js (recommended: latest LTS)
- npm

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file (Vite reads variables prefixed with `VITE_`):

Create `.env.local` in the repo root:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Run locally

Start the development server:

```bash
npm run dev
```

Vite will print the local URL (by default it’s under the configured base path):

- `http://localhost:5173/olive-startup-house-crm`

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run start
```

## Project structure

```text
client/                 # Frontend app (Vite root)
  src/
    actions/            # Client-side actions (e.g. auth)
    components/         # UI components
    hooks/              # React hooks
    lib/                # Supabase, auth provider, i18n, helpers
    pages/              # App pages/routes
    shared/             # Shared types/schemas used by the UI
vite.config.ts          # Vite config (root is client/)
tsconfig.json           # TypeScript config
tailwind.config.ts      # Tailwind config
```

## Auth behavior (Supabase)

- **Sign up**: if email confirmation is required, user will see a message to check email and open the confirmation link.
- **Sign in**: successful login redirects to the dashboard.

## Troubleshooting

- **Blank page / wrong URL**: open the URL that Vite prints (it includes the base path).
- **Supabase errors**: confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and match your Supabase project.
