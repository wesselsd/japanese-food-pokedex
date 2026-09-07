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

Run the browser-level end-to-end tests against the generated static site:

```bash
npm run test:e2e
```

The first Playwright run may need a browser installation:

```bash
npx playwright install chromium
```

To watch the tests in a visible browser, use headed mode:

```bash
npx playwright test --headed
```

To pause execution and inspect each step with the Playwright Inspector:

```bash
npx playwright test --debug
```

Playwright UI mode is also available for selecting and rerunning individual tests:

```bash
npx playwright test --ui
```

To run one journey, pass its spec path and an optional title filter:

```bash
npx playwright test tests/e2e/catalog.spec.ts -g "photo"
```

## Supabase authentication

Create a Supabase project, then copy `.env.example` to `.env` and fill in the project URL and public anonymous key:

```bash
Copy-Item .env.example .env
```

The public anonymous key is safe to use in the browser. Do not put a Supabase service-role key in `.env` or frontend code.

When Supabase credentials are configured, the app shows sign-in and account-creation controls. Authentication code is isolated in `adapter/supabase/`, so the provider can be replaced later.

The optional Supabase integration smoke test uses the configured public
credentials to verify auth connectivity:

```bash
npm run test:integration
```

## Photo uploads

Before a photo is saved, the browser opens a wide 16:9 crop editor matching the food thumbnail shape. Drag the image to choose the visible area and use the zoom control if needed. The selected crop is resized to a 640x360 JPEG and compressed to a maximum of 100 KB before being stored. This keeps thumbnail storage small and avoids uploading the original camera image.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the site automatically whenever `main` changes.

In the repository on GitHub, configure **Settings → Pages → Source** as **GitHub Actions**. Then add these repository variables under **Settings → Secrets and variables → Actions → Variables**:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

These are public browser configuration values, not service-role secrets. The workflow sets the repository base URL to `/japanese-food-pokedex/`, so the site will be available at:

```text
https://wesselsd.github.io/japanese-food-pokedex/
```

### To kill stale node processes 

```bash
Get-Process node |  Stop-Process -Force
```
