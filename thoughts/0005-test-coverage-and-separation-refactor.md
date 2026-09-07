# Test coverage and separation-of-concerns refactor

Status: core refactor complete; integration and UI hardening in progress
Updated: 2026-09-07

## Implementation status

The core separation-of-concerns refactor is complete. The remaining work is
focused on live third-party integration coverage and the smaller set of UI paths
that are not practical to cover through pure domain or adapter tests.

| Phase | Status | Notes |
|---|---|---|
| 0. Measurable baseline | Complete | Coverage provider, thresholds, and a GitHub Actions test workflow are in place |
| 1. Pure catalog rules | Complete | Catalog, hierarchy, progress, category sections, ratings, and catalog invariants are extracted and tested |
| 2. Persistence port | Complete | Local store, cloud binding, photo persistence, and local-store tests exist; signed-in photos use only `user_food_photos` |
| 3. Supabase boundaries | Partial | Contract tests exist; live integration still only checks authentication |
| 4. Image processing | Complete | Compression is isolated and the 100KB behavior is tested |
| 5. Google Maps service | Mostly complete | Loading/search/geolocation service is extracted; component error/marker paths and script-tag branches are covered, with malformed payload cases remaining |
| 6. Authentication | Complete | Auth construction is injected and both composable and adapter behavior are tested |
| 7. Component coverage | Partial | Crop dialog, Maps paths, root check-in/unlock, edit/delete, and photo selection/removal have coverage; location-selection UI and keyboard/modal paths remain |
| 8. E2E and thresholds | Partial | CI thresholds and two deterministic browser journeys are in place; authenticated/location journeys remain |

The product decisions that affect the refactor are now settled. Essentials remain
the onboarding milestone. After all essentials are eaten, progress counts only
currently unlocked foods; hidden variations enter the denominator when unlocked
and do not affect the percentage beforehand. The removal migration preserves
legacy `user_foods` check-ins and photo paths, then drops that table. The
`user_food_photos` table remains the active multi-photo store with its
selected-photo state. The operational checks listed in the architecture notes
remain valid.

The current unit suite has 64 passing tests across 13 files. The latest measured
unit coverage is 82.25% statements overall, with the pure domain modules at 100%.
Two Playwright journeys additionally cover the generated static site in a real
Chromium browser.

## Executive summary

The current test suite provides strong coverage for the pure domain rules,
local/cloud adapter contracts, image processing, authentication, and the primary
catalog/photo journeys. It does not yet provide complete confidence in live
Supabase persistence or every location/modal interaction:

- `npm test` passes 64 tests.
- `npm run test:e2e` covers catalog persistence and the photo crop/upload/select/remove journey.
- `npm run test:integration` still covers one Supabase authentication smoke test;
  it does not yet exercise live progress or photo CRUD.
- Coverage reporting and thresholds are enforced by `.github/workflows/tests.yml`.
- The Supabase progress adapter, authentication flows, photo processing, and the
  critical root check-in flow have focused automated coverage.

The application now has explicit `ProgressStore`, `AuthAdapter`, Google Maps
service, image-processing, and pure-domain boundaries. The remaining coupling is
primarily visual: `app.vue` owns the page-level modal and form state, and
`LocationPicker.vue` owns map/marker lifecycle around the injected Maps service.

The recommended approach is an incremental refactor, not a rewrite. Extract pure
domain functions first, then move local persistence and browser/third-party
integration behind ports, and finally add focused adapter and component tests.

## Current test baseline

The 64 current unit tests are distributed as follows:

| Test file | Tests | Current scope |
|---|---:|---|
| `tests/app.test.ts` | 4 | Initial rendering, check-in/unlock, check-in edit/delete, and photo selection/removal |
| `tests/checkins.test.ts` | 2 | Rating and star formatting rules |
| `tests/foodCatalog.test.ts` | 8 | Hierarchy, filtering, progress, categories, catalog visibility, invariants, and artwork mapping |
| `tests/googleMaps.test.ts` | 10 | Maps service loading/reuse/failure, nearby search, point lookup, configuration, and geolocation |
| `tests/googlePlaces.test.ts` | 6 | Places parsing, nearby rendering, map initialization errors, and marker cleanup |
| `tests/imageCropDialog.test.ts` | 3 | Crop cancellation, JPEG crop output, and cropper change-canvas handling |
| `tests/imageProcessing.test.ts` | 2 | Progressive compression and 100KB limit |
| `tests/localProgress.test.ts` | 3 | Local persistence, legacy data, photos, and malformed data |
| `tests/supabaseAuth.test.ts` | 3 | Supabase auth adapter behavior and error propagation |
| `tests/supabaseProgress.test.ts` | 4 | Supabase progress and photo adapter contracts |
| `tests/useAuth.test.ts` | 3 | Auth orchestration and injected adapter behavior |
| `tests/useFoodPokedex.test.ts` | 15 | Labels, filtering, check-ins, local restoration, progress, and variation unlocking |
| `tests/integration/supabase.test.ts` | 1 | `auth.getSession()` against the configured Supabase project |

Because `vitest.config.ts` includes `tests/**/*.test.ts`, the integration test is
also included in `npm test`. The separate integration command only selects that
one file.

### Important uncovered behavior

- Live Supabase progress CRUD and photo lifecycle behavior against an isolated
  test identity or project
- Some malformed Google Places payloads
- Location-selection UI, keyboard interactions, and the remaining root-page modal
  paths

## Current responsibility map

### `useFoodPokedex.ts`

This composable currently coordinates:

- reactive check-ins, eaten state, filtering, visible foods, and progress;
- calls to pure catalog and check-in domain functions;
- an injected `ProgressStore` for local or cloud persistence;
- image compression before passing files to the progress store;
- explicit synchronization errors.

It no longer imports Supabase user types or accesses localStorage and Supabase
directly. Browser image APIs remain behind `utils/imageProcessing.ts`.

### `app.vue`

The root component currently:

- creates concrete Supabase and local adapters at the composition boundary;
- selects the injected local or cloud `ProgressStore`;
- owns modal state, check-in form state, authentication forms, and file selection;
- renders the catalog UI and coordinates child components;
- delegates category sections, ratings, progress, persistence, cropping, and Maps
  operations to their respective boundaries.

Category progress receives the visible/unlocked food list, so locked variations
do not affect category totals or post-onboarding progress until they unlock.

### `useAuth.ts`

This composable receives an injected `AuthAdapter`, manages session lifecycle and
subscription cleanup, and translates adapter failures into UI messages. Concrete
Supabase client and adapter construction happens in the composition root.

### `LocationPicker.vue`

The component combines rendering with map setup, marker lifecycle, map clicks,
geolocation display, and emitted error states. `adapter/googleMaps.ts` owns script
loading, library imports, nearby search, point lookup, and geolocation fallback
logging. `utils/googlePlaces.ts` remains the pure request and response-mapping
boundary.

### `ImageCropDialog.vue` and photo handling

The crop dialog owns cropper UI and crop readiness/fallback handling.
`utils/imageProcessing.ts` owns JPEG resizing and the 100KB limit, while
`ProgressStore` implementations own photo persistence and selected-photo state.

## Current remaining work

The core refactor is complete. The remaining hardening work is:

- add an isolated live Supabase integration flow for check-in and photo CRUD;
- cover malformed Google Places payloads and the remaining parser error branches;
- add focused `LocationPicker` selection/error tests and modal keyboard/close tests;
- decide whether an authenticated browser journey is worth the setup cost, using a
  dedicated test identity rather than a personal or production account;
- complete a focused audit for fallback and parsing-error logging;
- add an ID alias/migration mechanism before making future catalog renames.

## Target architecture

The target is a small set of explicit boundaries:

```text
domain/
  foodCatalog.ts       visibility, hierarchy, filtering, progress
  checkins.ts          check-in and rating rules

adapter/
  localProgress.ts     localStorage implementation
  supabaseProgress.ts  Supabase implementation
  auth.ts              auth port and Supabase implementation
  googleMaps.ts        Maps/Places client and script loading

utils/
  imageProcessing.ts   <=100KB JPEG compression

composables/
  useFoodPokedex.ts    Vue state orchestration
  useAuth.ts           auth state orchestration

components/
  ImageCropDialog.vue  crop selection UI
  LocationPicker.vue   location selection UI and emitted events
```

The exact directory names can follow existing project conventions. The important
invariants are:

1. Domain functions are pure and do not import Vue, Supabase, Google Maps, or
   browser storage APIs.
2. Adapters own serialization, network calls, storage paths, signed URLs, and
   third-party SDK details.
3. Composables coordinate reactive state and call injected ports.
4. Components render state and emit user intent rather than implementing
   persistence or third-party protocols.
5. The composition root is allowed to wire concrete adapters, but business rules
   should not depend on that wiring.

## Implementation plan

### Phase 0: Establish a measurable baseline

1. Add the existing Vitest coverage provider as a development dependency.
2. Add a coverage script that reports text and machine-readable output.
3. Exclude generated files, fixtures, and adapter implementation details only when
   the exclusion is intentional and documented.
4. Record the initial coverage report without setting an aggressive threshold.
5. Keep `npm test`, `npm run test:integration`, and `npm run generate` passing.

Do not use the first percentage as a quality target by itself. The initial purpose
is to reveal untested branches and prevent coverage from falling during the
refactor.

### Phase 1: Extract and test pure catalog rules — complete

Create pure functions for:

- resolving parent chains and determining whether a food is unlocked;
- selecting visible foods;
- applying search, category, label, and eaten filters;
- calculating eaten counts and progress totals;
- calculating category totals using the explicitly chosen visibility policy;
- finding highest ratings and formatting rating data if that remains shared logic.

Move these rules out of `useFoodPokedex.ts` and `app.vue`. Keep the composable
responsible for reactive refs and invoking the functions.

Add tests for:

- all current two-tier chains;
- a valid future three-tier chain;
- missing parents and cycles;
- locked variations excluded from every filter;
- the selected essential-first and unlocked-only progress policy;
- category totals matching the foods that the UI claims to show;
- duplicate IDs, invalid parent IDs, and catalog count invariants.

This phase resolved the progress policy: essentials are the onboarding milestone;
afterward, only currently unlocked foods count, and hidden variations enter the
denominator when unlocked.

### Phase 2: Introduce a persistence port — complete

Define an application-facing progress store that does not mention Supabase `User`
objects. It should cover loading and saving check-ins, photos, and selected photos,
or use separate smaller ports if that produces a clearer design.

Implement:

- `LocalProgressAdapter` for localStorage and legacy-format migration;
- a refactored Supabase adapter for cloud persistence;
- a composition layer that selects the local or cloud implementation.

Remove localStorage access and cloud branching from the domain behavior in
`useFoodPokedex.ts`. The composable should receive an injected store and react to
store failures through an explicit result/error path.

Add tests for:

- local load/save behavior;
- legacy eaten and photo formats;
- malformed stored data;
- check-in update and deletion;
- switching between signed-out and signed-in state;
- cloud adapter mapping in both directions;
- adapter failures without silently changing local state.

### Phase 3: Refactor and test Supabase boundaries — contract complete, live test remaining

Keep Supabase-specific query and storage code in the adapter. Add contract-style
tests with a fake Supabase client for:

- loading check-ins and current multi-photo records;
- adding, updating, and deleting check-ins;
- uploading, selecting, and deleting photos;
- signed URL creation failures;
- database and storage errors;
- user scoping on every query and mutation.

Legacy `user_foods` rows are preserved by the removal migration before that table
is dropped; the runtime adapter no longer contains a legacy compatibility path.

Retain one live integration suite for the deployed schema. It should use a
dedicated test identity or isolated test project, create and clean up test data,
and cover at least one check-in and one photo lifecycle. The existing auth
connectivity smoke test can remain as a fast prerequisite, but should not be
treated as the persistence integration test.

### Phase 4: Extract image processing

Move image decoding and compression into `utils/imageProcessing.ts` with a small
API such as:

```text
compressImageToLimit(source, { maxBytes: 100 * 1024, type: 'image/jpeg' })
```

Keep browser-specific construction at the edge or inject the image/canvas
operations so the compression algorithm can be tested without a full component.

Test:

- successful compression under 100KB;
- images that require dimension reduction;
- images that require quality reduction;
- the exact 100KB boundary;
- failure when the smallest configured output remains too large;
- object URL cleanup on success and failure.

`useFoodPokedex.ts` should only coordinate the returned `File` with the selected
photo adapter.

### Phase 5: Extract Google Maps service behavior — mostly complete

Create a Google Maps/Places service around:

- script loading and configuration;
- library imports;
- nearby restaurant search;
- point selection and named-place lookup;
- geolocation and map marker operations where they are not purely visual.

Keep `googlePlaces.ts` as the pure request and response-mapping module. Make
`LocationPicker.vue` consume the service and render loading, error, and result
states.

Add or maintain tests for:

- missing configuration;
- existing script reuse;
- script load and script failure;
- geolocation success, denial, timeout, and Tokyo fallback;
- map-click selection;
- nearby search success and failure;
- missing place ID, name, coordinates, and Maps URL;
- marker cleanup.

### Phase 6: Simplify authentication boundaries

Move concrete Supabase client construction to the composition root or a dedicated
factory. Make `useAuth` depend on an injected `AuthAdapter`.

Keep user-facing message formatting close to the UI, while the adapter returns
typed success or failure information.

Add unit tests for:

- initialization without configuration;
- session restoration;
- sign-in, sign-up, and sign-out;
- auth state changes;
- rejected Supabase calls;
- cleanup of auth subscriptions.

### Phase 7: Add focused component coverage

After the domain and adapter extraction, add a small number of component tests:

- `ImageCropDialog`: cancel and crop confirmation;
- `LocationPicker`: emitted selection and error states;
- check-in dialog: default rating, validation, edit, delete, and location;
- photo controls: add, select, replace, and remove;
- locked variation notice and category progress rendering;
- keyboard activation and modal close behavior.

Avoid testing every implementation detail of the large root template. Prefer
testing pure functions and a few user-visible integration paths.

### Phase 8: Add an end-to-end smoke path and thresholds — partially complete

The current browser-level journeys cover:

```text
browse a root food -> check it in -> see variations unlock -> reload and restore
upload a photo -> crop it -> save/select/remove it -> reload and restore
```

An authenticated journey and a location-selection journey remain optional follow-up
coverage.

Once the new tests have been stable for a few changes, add separate thresholds
for domain logic and the overall project. A reasonable starting policy is a high
threshold for pure domain modules and a lower, explicit threshold for browser
and adapter code. The exact numbers should be chosen from the measured baseline,
not used to justify excluding difficult code.

## Sequencing and risk control

- Preserve the existing public behavior while extracting code; do not combine the
  progress-model decision with unrelated adapter changes.
- Make each phase leave `npm test` green.
- Keep the live Supabase test isolated from unit tests and never use a personal
  production account for cleanup-based integration tests.
- Add ID migration handling before future catalog renames, but do not rewrite
  historical Supabase migrations.
- Refactor one boundary at a time so a failing test identifies the moved behavior.
- Prefer contract tests for adapters over asserting internal Supabase query syntax
  everywhere.

## Definition of done

The refactor is complete when:

- pure catalog and check-in rules can be tested without Vue, Supabase, Google, or
  browser storage;
- local and Supabase persistence implementations share an explicit application
  contract;
- image processing has direct tests for the 16:9/100KB requirements;
- Google Maps and auth integrations can be tested with fakes plus a small live
  smoke suite;
- the main component tests cover the critical user journeys;
- coverage is reported in CI with documented thresholds;
- category progress, hierarchy visibility, and progress denominators follow one
  tested policy;
- all existing tests and the static generation build remain green.
