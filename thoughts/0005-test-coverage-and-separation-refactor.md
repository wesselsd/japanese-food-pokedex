# Test coverage and separation-of-concerns refactor

Status: proposed implementation plan
Updated: 2026-09-07

## Executive summary

The current test suite is a useful starting point, but it does not yet provide
confidence in the complete application:

- `npm test` passes 19 tests.
- `npm run test:integration` passes one Supabase authentication smoke test.
- No coverage report, coverage threshold, or coverage instrumentation is configured.
- The Supabase progress adapter, authentication flows, photo processing, and most
  UI flows have no meaningful automated coverage.

The application has some useful boundaries, especially `ProgressAdapter`,
`AuthAdapter`, and the pure Google Places parsing helpers. However, the largest
composable and the root page still combine business rules, persistence, browser
APIs, presentation decisions, and third-party setup.

The recommended approach is an incremental refactor, not a rewrite. Extract pure
domain functions first, then move local persistence and browser/third-party
integration behind ports, and finally add focused adapter and component tests.

## Current test baseline

The 19 existing tests are distributed as follows:

| Test file | Tests | Current scope |
|---|---:|---|
| `tests/useFoodPokedex.test.ts` | 14 | Labels, filtering, check-ins, local restoration, progress, and variation unlocking |
| `tests/googlePlaces.test.ts` | 4 | Places request construction, response conversion, missing names, and one nearby-list component path |
| `tests/integration/supabase.test.ts` | 1 | `auth.getSession()` against the configured Supabase project |

Because `vitest.config.ts` includes `tests/**/*.test.ts`, the integration test is
also included in `npm test`. The separate integration command only selects that
one file.

### Important uncovered behavior

- Supabase progress loading, check-in CRUD, photo upload/deletion, signed URLs,
  selected-photo persistence, and error handling
- Sign-in, sign-up, sign-out, auth state changes, and authentication errors
- Image decoding, 16:9 crop output, progressive compression, and the 100KB limit
- Local photo persistence, legacy photo formats, malformed local data, and user
  switching
- Check-in update and deletion through both local and cloud paths
- Invalid food IDs, invalid rating values beyond the basic range check, missing
  parent entries, cyclic hierarchy data, and deeper hierarchy behavior
- Google Maps script loading, geolocation, map clicks, markers, nearby-search
  failures, missing coordinates, missing IDs, and missing URLs
- Crop-dialog behavior, modal flows, photo selection/removal, check-in editing,
  keyboard interactions, and the main page rendering
- Catalog invariants such as unique IDs, unique numbers, valid parent references,
  and artwork naming consistency

The project cannot currently state a numerical coverage percentage because no
coverage provider or reporting configuration is installed.

## Current responsibility map

### `useFoodPokedex.ts`

This composable currently contains:

- food visibility, hierarchy unlocking, filtering, and progress rules;
- check-in mutations;
- localStorage loading and saving;
- Supabase progress orchestration;
- image decoding and compression;
- object URL, `FileReader`, canvas, `Image`, and `crypto` usage.

It also accepts a Supabase `User` type and a cloud adapter, which couples the
application behavior layer to infrastructure details.

### `app.vue`

The root component currently:

- creates the Supabase client and progress adapter;
- calculates category sections and category progress;
- calculates highest ratings and star strings;
- owns modal state and check-in form state;
- coordinates cropping, photo saving, and location selection;
- renders the complete catalog UI.

The category progress calculation uses the full catalog for its denominator while
the visible food list excludes locked variations. This is both a product decision
and business logic currently embedded in presentation code.

### `useAuth.ts`

This composable reads runtime configuration, creates the Supabase client, manages
the auth subscription, and translates failures into UI messages. The
`AuthAdapter` is a good starting boundary, but the composable still performs
third-party setup directly.

### `LocationPicker.vue`

The component combines rendering with Google Maps script loading, library imports,
geolocation, map setup, marker lifecycle, map clicks, Places searches, and error
handling. `utils/googlePlaces.ts` already provides a useful pure parsing boundary,
but the client/service boundary remains inside the Vue component.

### `ImageCropDialog.vue` and photo handling

The crop dialog owns the cropper UI, while compression and persistence are in
`useFoodPokedex.ts`. The user-facing photo flow therefore crosses several
responsibilities without a separately testable image-processing module.

## Target architecture

The target is a small set of explicit boundaries:

```text
domain/
  foodCatalog.ts       visibility, hierarchy, filtering, progress
  checkins.ts          check-in and rating rules

adapters/
  localProgress.ts     localStorage implementation
  supabaseProgress.ts  Supabase implementation
  auth.ts              auth port and Supabase implementation
  googleMaps.ts        Maps/Places client and script loading

utils/
  imageProcessing.ts   crop result validation and <=100KB compression

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

### Phase 1: Extract and test pure catalog rules

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
- the selected essential/root/full-catalog progress policy;
- category totals matching the foods that the UI claims to show;
- duplicate IDs, invalid parent IDs, and catalog count invariants.

This phase should also resolve the current ambiguity around whether category
progress counts locked variations.

### Phase 2: Introduce a persistence port

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

### Phase 3: Refactor and test Supabase boundaries

Keep Supabase-specific query and storage code in the adapter. Add contract-style
tests with a fake Supabase client for:

- loading check-ins and both legacy and multi-photo records;
- adding, updating, and deleting check-ins;
- uploading, selecting, and deleting photos;
- signed URL creation failures;
- database and storage errors;
- user scoping on every query and mutation.

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

### Phase 5: Extract Google Maps service behavior

Create a Google Maps/Places service around:

- script loading and configuration;
- library imports;
- nearby restaurant search;
- point selection and named-place lookup;
- geolocation and map marker operations where they are not purely visual.

Keep `googlePlaces.ts` as the pure request and response-mapping module. Make
`LocationPicker.vue` consume the service and render loading, error, and result
states.

Add tests for:

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

### Phase 8: Add an end-to-end smoke path and thresholds

Add one browser-level happy path covering:

```text
browse a root food
-> check it in
-> see its variations unlock
-> add a cropped photo
-> save a location
-> reload and see the state restored
```

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
