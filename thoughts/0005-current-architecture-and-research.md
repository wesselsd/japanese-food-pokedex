# Current architecture and research notes

**Date:** 2026-09-10  
**Status:** Current implementation baseline

This document supersedes the image, catalog-size, and deployment assumptions in
`thoughts/0004-current-architecture-and-loose-ends.md`. It describes the
implementation currently in the repository after the catalog thumbnail and
image-cache work.

## 1. Product shape

Japanese Food Pokedex is a mobile-first Japanese food discovery and progress
tracking application. A visitor can browse the catalog, search and filter
foods, check in foods they have eaten, rate individual visits, record a
location, upload personal photos, and explore food variations that unlock from
parent foods.

The application is a client-rendered Nuxt site. There is no server-side
application in this repository. Static catalog data and artwork are shipped
with the frontend; optional user state is stored either in browser storage or
Supabase.

The current `pokedex/data/foods.json` inventory contains:

- 150 catalog entries
- 100 root foods
- 50 child/variation foods
- 12 essential foods
- 8 top-level categories

The catalog is larger than the 116-entry inventory described by the older
architecture document. The JSON file is the current catalog source of truth.

## 2. Runtime and deployment architecture

### Frontend

- Framework: Nuxt 3 with Vue and TypeScript.
- Rendering: `ssr: false`; the application is a browser SPA generated as static
  files.
- Application entrypoint: `pokedex/app.vue`.
- Local development: `npm run dev`.
- Static generation: `npm run generate`.
- Preview: `npm run preview`.

`app.vue` is intentionally the orchestration layer. It owns the page layout,
tabs, search and filter controls, catalog cards, modal/dialog state, auth
controls, check-in forms, photo dialogs, and the handoff to the location
picker. Domain calculations and persistence are delegated to composables,
domain modules, and adapters rather than being implemented in the template.

### GitHub Pages

The workflow is `.github/workflows/deploy-pages.yml`. It:

1. Installs dependencies in `pokedex`.
2. Runs `npm run generate`.
3. Uploads `pokedex/.output/public` as the Pages artifact.
4. Deploys with the GitHub Pages deployment action.

The workflow currently passes `NUXT_APP_BASE_URL: /` and exposes the public
Supabase URL and anonymous key through repository variables. The public key is
intended for browser use; a service-role key must never be placed in frontend
configuration.

There is a documentation inconsistency to resolve: `pokedex/README.md` and the
older architecture notes describe `/japanese-food-pokedex/` as the base path,
while the current workflow explicitly builds with `/`. The workflow is the
current operational behavior, but the deployed URL and base-path choice should
be confirmed before changing either configuration or documentation.

## 3. Application composition

### Main state coordinator

`pokedex/composables/useFoodPokedex.ts` coordinates:

- Reactive check-ins and eaten-food projections.
- Food visibility, searching, category filtering, label filtering, and eaten
  status filtering.
- Essential-food and unlocked-food progress.
- Local/cloud progress-store calls.
- Uploaded-photo state and selected-photo state.
- Sync error state.

The composable receives the catalog and a `ProgressStore` reference. This keeps
the UI independent of whether persistence is local or remote.

### Authentication

`pokedex/composables/useAuth.ts` owns the current session and auth actions.
`pokedex/adapter/supabase/auth.ts` wraps Supabase authentication behind a small
adapter with session loading, password sign-in, sign-up, sign-out, and auth
state-change subscription.

The app uses the configured Supabase URL and anonymous key when both are
available. Without configured credentials, the app remains usable with local
storage. Auth failures are surfaced to the UI rather than converted into
successful-looking state.

### Domain modules

The domain layer is under `pokedex/domain/`:

- `foodCatalog.ts` validates catalog invariants, determines visibility,
  recursively checks parent unlocks, filters foods, builds category sections,
  groups evolution trees, and calculates progress.
- `checkins.ts` normalizes ratings, selects highest ratings, and formats
  stars.
- `progress.ts` defines the shared check-in, location, photo, progress-state,
  and persistence-port types.

A child food is hidden until every ancestor in its parent chain has a
check-in. Visibility is applied before search or category filtering, so locked
foods cannot be discovered by searching for their names.

## 4. Catalog and artwork pipeline

### Catalog data

`pokedex/data/foods.json` contains the runtime metadata: identifiers, display
names, Japanese names, descriptions, categories, food types, essential flags,
parent relationships, emoji, and colors.

`pokedex/data/foods.ts` adds the typed `Food` representation and resolves
catalog artwork. The runtime resolver eagerly imports WebP files from
`pokedex/assets/thumbnails/` and maps each display name to a thumbnail slug.
The application no longer imports the original PNG catalog artwork.

### Source artwork

`pokedex/assets/images/` contains the original generated artwork. These files
are source inputs, not normal runtime assets. They are still needed by:

- `pokedex/scripts/resize_images.py`, which creates runtime thumbnails.
- `pokedex/scripts/food_gen.py`, which can generate missing source artwork
  through the configured Gemini image API.

`food_gen.py` requires `API_KEY`, reads names from `data/foods.json`, skips
existing files, and writes `<slug>_image.png` files. The API key is not part of
the repository or browser bundle.

### Thumbnail generation

`pokedex/scripts/resize_images.py` scans all supported image files in
`assets/images` rather than naming one file explicitly. It:

- Applies EXIF orientation.
- Preserves aspect ratio without enlarging small inputs.
- Limits the longest dimension to 600 pixels.
- Encodes WebP with adaptive quality.
- Targets 10 KB per thumbnail, with a minimum quality of 50.
- Writes `<source-stem-without-_image>.webp` to `assets/thumbnails`.

The generated thumbnails are committed because they are application build
inputs. The source PNGs remain committed as the editable artwork inputs.

The repository currently has 151 source/thumbnails while the catalog has 150
entries. `curry-rice.webp` is an orphan left over from an earlier naming
scheme; the resize script does not delete destination files that no longer
have a matching source. This is harmless at runtime but is a cleanup and
pipeline-invariant candidate.

### Runtime image behavior

Catalog card images use browser lazy loading and asynchronous decoding:
`loading="lazy"` and `decoding="async"`. Uploaded user photos are separate from
catalog artwork and are not placed in the catalog image cache.

Nuxt previously emitted image prefetch hints for every eagerly imported
catalog image. The `build:manifest` hook in `pokedex/nuxt.config.ts` now
removes image prefetch entries so the browser does not request the entire
catalog on the initial page load.

The measured cold initial load after this change was approximately:

- Mobile viewport: 16 images, about 161 KB.
- Desktop viewport: 12 images, about 118 KB.

The clean generated output contains 151 WebP catalog assets totaling roughly
1.48 MB, but only images requested by the browser are cached or transferred
during normal initial navigation.

## 5. Offline image caching

The image cache is production-only and consists of:

- `pokedex/plugins/imageCache.client.ts`: registers `public/sw.js` after the
  page is running and waits for registration readiness.
- `pokedex/public/sw.js`: implements cache-first handling for local hashed
  catalog image assets.

The current cache name is `catalog-images-v2`. The service worker recognizes
hashed local WebP catalog assets and retains compatibility matching for old
hashed PNG assets during transition. On activation it removes older
`catalog-images-*` caches and calls `self.clients.claim()`.

Caching is on demand, not a full-catalog pre-cache. A requested catalog image
is served from the cache on later requests when the browser retains the cache;
the browser may still evict storage under device or storage pressure. Hashed
asset URLs mean regenerated artwork naturally gets a new cache key. Bumping the
cache name is appropriate when the cache contents or strategy needs an
explicit migration.

Registration failures are logged. The service worker does not cache third-party
images, uploaded photos, or arbitrary application requests.

## 6. Persistence model

The common persistence contract is defined by `ProgressStore` in
`pokedex/domain/progress.ts`. The UI and composable use this contract without
knowing which adapter is active.

### Signed-out/local mode

`pokedex/adapter/localProgress.ts` stores:

- `pokedex-checkins`
- `pokedex-photos`
- `pokedex-selected-photos`

It also migrates the legacy `pokedex-eaten` representation into check-ins.
Check-ins support multiple visits for the same food, including rating, time,
location text, and optional structured location details. Photos are stored as
browser data URLs after client-side processing.

Malformed stored data and storage failures are surfaced through the existing
error path. Local storage is convenient for anonymous use but is device- and
browser-specific and is not a synchronization system.

### Signed-in/cloud mode

`pokedex/adapter/supabase/progress.ts` maps the same contract to Supabase:

- `user_food_checkins` stores one row per check-in, including rating, location,
  and `location_details` JSON.
- `user_food_photos` stores photo metadata and the selected-photo flag.
- The private `food-photos` storage bucket stores the JPEG bytes.

Rows and storage paths are scoped to the authenticated user. Row-level
security policies enforce user ownership. Photo loading creates one-hour
signed URLs. Uploading clears the previous selected flag, inserts the new
photo as selected, and returns a signed URL. Deleting removes the storage
object and metadata row. The database has a partial unique index so one photo
can be selected per user and food.

### Database migration history

The migrations under `pokedex/supabase/migrations/` show the transition from a
server-side static food catalog and single-row progress model to the current
static frontend catalog plus user-scoped check-ins and multiple photos. The
latest migration:

- Adds selected-photo support.
- Migrates legacy `user_foods` check-ins and photos.
- Preserves selected-photo references where possible.
- Drops the legacy `user_foods` table.

The historical `public.foods` table is no longer the runtime catalog source.
Changes to `foods.json` and the artwork pipeline therefore need to be treated
as frontend release changes, not as Supabase catalog migrations.

## 7. Photo and location flows

### User photo flow

The file inputs in `app.vue` intentionally use:

```html
<input type="file" accept="image/*">
```

They do not use a `capture` attribute, allowing Safari users to choose an
existing photo as well as open the camera chooser.

`components/ImageCropDialog.vue` provides a 16:9 crop editor. The selected
image is resized to 640x360 and compressed to a JPEG of at most 100 KB before
being written to local storage or uploaded to Supabase. The 16:9 shape matches
the catalog artwork presentation.

The detail dialog can show the default catalog image and multiple uploaded
photos. A user can select or remove uploaded photos. The selected uploaded
photo overrides the catalog image for the food card/detail display.

### Location flow

`components/LocationPicker.vue` and `utils/googleMaps.ts` /
`utils/googlePlaces.ts` integrate Google Maps only when the location picker is
opened. The map, marker, and Places libraries are loaded lazily. The picker
supports map selection and nearby restaurant search, then returns a structured
location containing place ID, name, address, coordinates, and Maps URL.

Google Places responses are parsed strictly. Missing required names are logged
as parsing errors and represented as `Unknown restaurant` rather than silently
using an address as a different field. The selected structured location is
persisted with the check-in.

## 8. Test and validation architecture

### Unit/component tests

Vitest runs in `happy-dom` with the test files under `pokedex/tests/`. Current
coverage includes:

- Catalog hierarchy, filtering, invariants, and progress.
- Local progress persistence and legacy migration.
- Supabase progress and auth adapters.
- `useFoodPokedex` and auth composables.
- App-level check-in, evolution, and photo journeys.
- Image processing and crop behavior.
- Google Maps and Places parsing/component behavior.

Available commands are defined in `pokedex/package.json`:

```text
npm test
npm run test:coverage
npm run test:watch
npm run test:integration
```

The integration test requires `NUXT_PUBLIC_SUPABASE_URL` and
`NUXT_PUBLIC_SUPABASE_ANON_KEY`; it intentionally fails when those variables
are absent instead of reporting a false successful connectivity check.

### Browser tests

`pokedex/tests/e2e/catalog.spec.ts` runs through Playwright against a generated
static site. The configured web server runs:

```text
npm run generate && npx serve --no-clipboard --listen tcp://127.0.0.1:4173 .output/public
```

The suite covers the main catalog journey, lazy artwork behavior, photo input
attributes, service-worker cache naming, check-in flows, and photo handling.
The Playwright project is Chromium and prefers the installed system Chrome on
Windows when available.

## 9. Current strengths and intentional boundaries

- The UI is decoupled from storage through `ProgressStore`.
- Locked catalog descendants are hidden before filtering, preventing accidental
  discovery through search.
- Anonymous use works without a backend.
- Authenticated data is user-scoped by both adapter filters and Supabase RLS.
- Catalog artwork is small, lazy, cacheable, and independent of personal
  uploads.
- Static generation makes the deployment simple and keeps the catalog available
  without a runtime server.
- Image uploads are normalized before persistence, limiting storage and network
  cost.
- Google Maps is lazy-loaded and isolated from the initial page load.

The principal architectural boundary is that catalog metadata, hierarchy, and
artwork are build-time frontend assets, while only personal progress and
photos are cloud-backed.

## 10. Loose ends and follow-up candidates

These are observations, not changes made by this document:

1. Reconcile the `/` versus `/japanese-food-pokedex/` base-path documentation
   and deployment behavior.
2. Remove or account for the orphan `curry-rice.webp`, and consider making the
   resize script delete stale generated thumbnails only when explicitly asked.
3. Add a generated-artwork invariant that compares every catalog display-name
   slug with exactly one thumbnail and reports orphan thumbnails separately.
4. Decide whether source PNGs should remain in the Git repository long term or
   move to a separate artwork-generation workflow/artifact store. The current
   script requires them as editable source inputs.
5. Consider signed-URL refresh behavior for long-lived authenticated sessions;
   current Supabase photo URLs are valid for 3,600 seconds and are refreshed
   when progress is loaded again.
6. Keep the migration history and static catalog distinction explicit when
   adding foods. A new food requires JSON metadata, source artwork, generated
   thumbnail, and tests/build validation; it does not require inserting a row
   into the historical `public.foods` table.
7. Continue testing the service worker and base path on the actual Pages URL,
   because local preview at `/` does not exercise repository-subpath hosting.

## 11. Canonical files for future work

| Concern | Current source |
| --- | --- |
| Application orchestration | `pokedex/app.vue` |
| Shared application state | `pokedex/composables/useFoodPokedex.ts` |
| Authentication state | `pokedex/composables/useAuth.ts` |
| Catalog metadata | `pokedex/data/foods.json` |
| Catalog typing/artwork mapping | `pokedex/data/foods.ts` |
| Catalog rules | `pokedex/domain/foodCatalog.ts` |
| Check-in rules | `pokedex/domain/checkins.ts` |
| Persistence ports | `pokedex/domain/progress.ts` |
| Local persistence | `pokedex/adapter/localProgress.ts` |
| Supabase persistence | `pokedex/adapter/supabase/progress.ts` |
| Supabase auth | `pokedex/adapter/supabase/auth.ts` |
| User image crop/compression | `pokedex/components/ImageCropDialog.vue` |
| Location picker | `pokedex/components/LocationPicker.vue` |
| Places parsing | `pokedex/utils/googlePlaces.ts` |
| Catalog thumbnail generation | `pokedex/scripts/resize_images.py` |
| Source artwork generation | `pokedex/scripts/food_gen.py` |
| Runtime catalog artwork | `pokedex/assets/thumbnails/` |
| Original artwork inputs | `pokedex/assets/images/` |
| Image cache registration | `pokedex/plugins/imageCache.client.ts` |
| Image cache strategy | `pokedex/public/sw.js` |
| Static deployment | `.github/workflows/deploy-pages.yml` |
| Unit/component tests | `pokedex/tests/` |
| Browser tests | `pokedex/tests/e2e/catalog.spec.ts` |
