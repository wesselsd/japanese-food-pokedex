# Pokedex website

The Nuxt application will live in this folder.

Planned capabilities:

- Browse Japanese foods
- Mark foods as eaten
- Upload photos for foods
- Work well on Android phones
- Deploy as a static site to GitHub Pages

## Run locally

Install dependencies once, then start the Nuxt development server:

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:3000`.

To test the generated static build:

```bash
npm run generate
npm run preview
```

## Tests

Run the unit tests once:

```bash
npm test
```

Run them in watch mode while developing:

```bash
npm run test:watch
```

The initial tests cover the `useFoodPokedex` composable: searching, category filtering, eaten-state tracking, and local-storage restoration.

## Supabase authentication

Create a Supabase project, then copy `.env.example` to `.env` and fill in the project URL and public anonymous key:

```bash
Copy-Item .env.example .env
```

The public anonymous key is safe to use in the browser. Do not put a Supabase service-role key in `.env` or frontend code.

When Supabase credentials are configured, the app shows sign-in and account-creation controls. Authentication code is isolated in `adapter/supabase/`, so the provider can be replaced later.

The initial database migration is in `supabase/migrations/20260905205000_create_foods.sql`. Run it in the Supabase SQL Editor before running the integration test:

```bash
npm run test:integration
```

The integration test reads one row from `public.foods` using the publishable key.

To persist eaten foods and photos per account, also run:

```text
supabase/migrations/20260905211500_create_user_progress.sql
```

This creates the user-scoped progress table and private `food-photos` Storage bucket with row-level security policies.

## Photo uploads

Before a photo is saved, the browser opens a wide 16:9 crop editor matching the food thumbnail shape. Drag the image to choose the visible area and use the zoom control if needed. The selected crop is resized to a 640x360 JPEG and compressed to a maximum of 100 KB before being stored. This keeps thumbnail storage small and avoids uploading the original camera image.

### To kill stale node processes 

```bash
Get-Process node |  Stop-Process -Force
```
