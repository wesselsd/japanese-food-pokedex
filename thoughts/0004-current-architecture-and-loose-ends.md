# Current architecture and loose ends

Updated 2026-09-07.

## Product snapshot

Japanese Food Pokedex is a mobile-first static web app for browsing Japanese foods
and drinks, marking entries as eaten, rating check-ins, recording locations, and
saving personal photos.

The runtime catalog currently contains:

- 116 total entries
- 87 root-level entries visible initially
- 29 locked variations
- 14 essential entries

The current progress display uses the 14 essential entries first. After all
essential entries are eaten, it tracks only unlocked foods; newly unlocked
variations increase the denominator when they become available. Hidden
variations do not affect the progress percentage before they are unlocked.

## Application architecture

- `pokedex/` contains the Nuxt 3 application.
- Nuxt runs with `ssr: false` and generates static output for GitHub Pages.
- `pokedex/app.vue` owns the page layout, card rendering, modal state, filter
  controls, check-in dialogs, photo dialogs, and location-picker integration. It
  composes the domain rules and the injected progress store without owning
  persistence or catalog policy.
- `pokedex/composables/useFoodPokedex.ts` coordinates reactive check-ins, eaten
  state, filtering, visible foods, progress projections, and photo state through
  the `ProgressStore` port.
- `pokedex/domain/` contains pure catalog, progress, rating, and check-in rules.
- `pokedex/adapter/localProgress.ts` and `pokedex/adapter/supabase/` contain the
  localStorage and Supabase infrastructure implementations of the progress and
  authentication ports.
- `pokedex/composables/useAuth.ts` owns Supabase session state.
- `pokedex/adapter/supabase/` contains the authentication and progress adapters.
- `pokedex/components/ImageCropDialog.vue` contains the upload crop flow.
- `pokedex/components/LocationPicker.vue` contains Google Maps and Places UI.
- `pokedex/assets/css/main.css` contains the single-page visual system.

## Catalog and hierarchy

`pokedex/data/foods.json` is the runtime source of food metadata. Each entry has a
stable `id`, display number, names, category, food-type labels, description, emoji,
color, and optional `parentId`. `pokedex/data/foods.ts` types the entries, resolves
predefined artwork with `import.meta.glob`, and supplies the emoji fallback when
artwork is missing.

The current two-tier chains are:

```text
Sushi -> Uni gunkan, Ikura gunkan, Anago nigiri, Hotate nigiri,
         Engawa nigiri, Kani maki
Udon -> Curry udon, Yaki-udon, Sara udon
Mochi -> Daifuku
Dango -> Mitarashi dango
Yakitori -> Tsukune
Unagi kabayaki -> Unadon
Japanese curry rice -> Katsu curry
Tea -> Green Tea, Hojicha, Mugicha
Sake -> Junmai Sake, Ginjo Sake, Nigori Sake, Namazake
Japanese mixed drink -> Hoppy Set, Lemon Sour, High Ball, Chuhai
Shochu -> Imo Shochu, Mugi Shochu
Ramen -> Tsukemen, Hiyashi chuka
```

Entries without `parentId` are visible initially. A variation becomes visible after
the user has at least one check-in for its parent. The unlock helper walks up the
parent chain, so deeper hierarchies are supported even though the current catalog
does not enable a third tier. Visibility is applied before search, category,
food-type, or eaten-status filtering.

The catalog currently uses direct ID replacements for renamed entries because there
were no check-ins when those changes were made. Old historical Supabase migrations
still contain earlier catalog rows, but the frontend no longer reads the static
Supabase catalog table.

## Check-ins and persistence

The main check-in type is:

```text
{ id, foodId, eatenAt, rating, location, locationDetails? }
```

Multiple check-ins per food are supported. A food is considered eaten when at least
one check-in exists, and cards display the highest rating.

Signed-out state is stored in localStorage:

- `pokedex-checkins`
- `pokedex-photos`
- `pokedex-selected-photos`

Legacy eaten and single-photo formats are still read for signed-out local data.
Signed-in users use Supabase through the progress adapter. Check-ins and location
details are stored in `user_food_checkins`; multi-photo persistence uses
`user_food_photos`, including its selected-photo flag. The legacy `user_foods`
table is removed by the latest migration.

## Photos and artwork

Catalog artwork lives in `pokedex/assets/images/` and is named from the display
name. Uploaded photos use this flow:

1. The user selects an image.
2. `vue-advanced-cropper` presents a movable and resizable 16:9 stencil.
3. The cropped result is progressively resized and compressed to at most 100KB.
4. Signed-out photos are stored as data URLs; signed-in photos are uploaded to the
   private `food-photos` Supabase bucket.

The predefined catalog artwork is not subject to the 100KB upload limit. Missing
catalog artwork falls back to the entry emoji.

## Google Maps and Places

`LocationPicker.vue` loads the Maps JavaScript API on demand and imports the Maps,
Marker, and Places libraries. It supports:

- Map-click location selection with a named-place lookup
- Browser geolocation with a Tokyo fallback
- Current-location and selected-location markers
- Nearby restaurant search using Places API (New)

Google `Place` instances are held in a `shallowRef` so Vue does not wrap SDK
objects in reactive proxies. `utils/googlePlaces.ts` performs strict parsing of
display names, coordinates, IDs, addresses, and Maps URLs, with explicit error logs
for malformed responses.

## Deployment and configuration

`.github/workflows/deploy-pages.yml` builds and deploys the static site from `main`
to GitHub Pages using `/japanese-food-pokedex/` as the base URL.

The build receives Supabase configuration from repository variables. The Google Maps
key can come from repository variables or secrets. The browser key should use
HTTP-referrer restrictions, and production must have a valid Google Maps Map ID for
`AdvancedMarkerElement`.

Supabase migrations must be applied before cloud check-ins, location details, or
multi-photo persistence can work correctly. The latest migration first preserves
legacy `user_foods` check-ins and photo paths in `user_food_checkins` and
`user_food_photos`, then removes the obsolete compatibility table.

## Tests and validation

The current test suite includes:

- `tests/useFoodPokedex.test.ts` for filtering, persistence, progress, hierarchy
  visibility, and unlock behavior
- `tests/googlePlaces.test.ts` using the captured real Places response structure
- `tests/integration/supabase.test.ts` for Supabase integration behavior

Available commands from `pokedex/` are:

```text
npm test
npm run test:integration
npm run generate
```

The Supabase integration test requires local environment configuration and an
accessible database with the migrations applied.

## Loose ends for tomorrow

### 1. Progress model (decided)

The onboarding milestone remains `0/14 essential foods tried`. Once all essentials
are eaten, progress uses only currently unlocked foods. Hidden variations are added
to the denominator when unlocked and do not affect the percentage beforehand.

### 2. Add an ID migration strategy before real usage

Several entries were renamed by replacing their IDs directly. That was safe before
the first check-ins, but future renames must migrate:

- localStorage check-ins and photos
- Supabase `food_id` values
- selected-photo records
- any saved deep links or external references

An explicit alias/migration map should be added before further post-release catalog
renames.

### 3. Refine hierarchy UX

The current UI shows a count such as "29 variations awaiting a parent check-in," but
does not say which parent unlocks which entries. Consider:

- showing locked children grouped under their parent;
- displaying the parent and unlock requirement in the detail view;
- adding a subtle locked preview without making locked foods searchable;
- deciding how a deleted parent check-in should affect already viewed children.

The recursive unlock code supports deeper chains. Third-tier catalog additions
should continue to follow the same parent-chain rule.

### 4. Curate remaining root entries and labels

The root count is lower but still 87. Candidate groupings should be added only when
the parent is a recognizable user goal, not merely a broad technical category.
`Sashimi -> Hamachi sashimi` remains deferred because it currently has only one
child. Food-type labels also mix preparation types, ingredients, and beverage
classes; a later pass should decide whether those are one unified tag system.

### 5. Clean up persistence boundaries

The legacy `user_foods` compatibility table is being removed. Current signed-in
photo persistence uses only `user_food_photos` and its selected-photo flag. Signed
URLs expire after one hour, so a long-lived session may still need URL refresh
behavior for previously loaded photos.

### 6. Expand UI and integration coverage

The core composable behavior and the main catalog/photo browser journeys are covered,
but there are no browser-level tests for:

- modal keyboard/focus behavior
- Google Maps loading and location selection
- locked variation rendering in category sections

These should be added selectively if the corresponding flows become active sources
of regressions.

### 7. Operational checks

Before the next release, confirm:

- all current Supabase migrations are applied in the deployed project;
- repository variables and secrets match the production Supabase and Google Maps
  configuration;
- Google API restrictions allow the GitHub Pages origin;
- the static deployment still uses the correct base URL;
- newly generated catalog artwork is present and uses the display-name filename
  convention.
