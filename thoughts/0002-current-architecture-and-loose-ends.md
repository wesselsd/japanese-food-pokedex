# Current architecture and loose ends

Updated 2026-09-06.

## Product

Japanese Food Pokedex is a mobile-first static web app for browsing Japanese foods, marking foods as eaten, rating individual check-ins, recording locations, and saving personal photos. The catalogue currently contains 112 foods and drinks. The stable catalogue IDs are the link between the local catalogue and user progress.

## Application architecture

- `pokedex/` contains the Nuxt application.
- Nuxt 3 runs as an SPA (`ssr: false`) and is generated as static output for GitHub Pages.
- The main Vue UI is in `pokedex/app.vue`.
- `pokedex/composables/useFoodPokedex.ts` owns filtering, check-ins, local persistence, photo state, photo selection, and photo removal.
- Authentication state is in `pokedex/composables/useAuth.ts`.
- Supabase-specific persistence is isolated in `pokedex/adapter/supabase/`.
- Styling is in `pokedex/assets/css/main.css`.
- The app is deployed from `main` using `.github/workflows/deploy-pages.yml` to `https://wesselsd.github.io/japanese-food-pokedex/`.

## Catalogue and artwork

- The runtime catalogue is `pokedex/data/foods.json`, loaded and typed by `pokedex/data/foods.ts`.
- Supabase is not the runtime source for food metadata. `user_foods.food_id` matches the JSON catalogue by its stable `id`.
- Catalogue entries contain names, Japanese names, descriptions, categories, food-type labels, colors, emojis, essential status, and stable numbers.
- `foodLabels()` deduplicates labels case-insensitively and omits the redundant `Rice` label for the `Rice & Bowls` category.
- Generated artwork is stored in `pokedex/assets/images/` and discovered with `import.meta.glob`.
- Displayed image priority is the selected uploaded image, the predefined catalogue artwork, then the emoji fallback.
- `pokedex/scripts/food_gen.py` generates missing artwork relative to the script location and must not run automatically.

## User progress

- A check-in is `{ id, foodId, eatenAt, rating, location }`. Multiple check-ins are supported per food.
- A food is considered eaten when it has at least one check-in.
- Cards show a check mark for eaten foods and the highest rating as full/empty star characters beside the Japanese name.
- The detail modal shows check-in history, editable check-ins, locations, ratings, deduplicated labels, and dangerous red removal actions.
- Filtering by search, category, label, or eaten status renders one flat result grid. Unfiltered browsing retains the Essential and category sections.
- When a detail, check-in, or edit modal is open, `body.modal-open` prevents background scrolling and the modal owns vertical scrolling.

## Photos

- Photos are represented as `{ id: string; url: string }` and stored in `Record<string, FoodPhoto[]>`.
- Each food can have multiple uploaded photos. The detail modal displays thumbnails, allows selecting the predefined image or an uploaded image, and allows removing uploaded images.
- The upload flow opens a vue-advanced-cropper dialog with a movable and resizable 16:9 crop stencil, then resizes the cropped JPEG to at most 100KB before display and persistence.
- Signed-in users upload the original selected file to Supabase. Signed-out users convert it to a data URL and persist it in localStorage.
- A temporary object URL is shown immediately while cloud upload or local data-URL conversion completes.
- Legacy single-photo localStorage entries and legacy `user_foods.photo_path` rows remain supported.

## Supabase data and migrations

- Supabase provides email/password authentication, per-user check-ins, selected-photo metadata, and private photo storage.
- The static catalogue table is no longer used by the frontend. `20260906120000_remove_static_food_catalogue.sql` removes the old catalogue table and foreign key.
- `user_foods` remains for compatibility and now stores `selected_photo_id`.
- `user_food_photos` stores one row per uploaded image: `id`, `user_id`, `food_id`, `photo_path`, and `created_at`.
- Uploaded storage paths use `${userId}/${foodId}/${photoId}.jpg` in the `food-photos` bucket.
- `pokedex/supabase/migrations/20260906183000_add_multiple_food_photos.sql` adds the multi-photo schema and RLS policies.
- RLS policies restrict progress and photo metadata to the authenticated owner. Storage deletion is restricted to paths under the authenticated user's folder.
- Signed-in state is loaded through the progress adapter, which also signs private storage URLs. Signed-out state uses localStorage keys for check-ins, photos, and selected photos.

## Validation

From `pokedex/`:

```text
npm test
npm run test:integration
npm run generate
```

The integration test requires the local `.env` Supabase configuration and an accessible database with the migrations applied.

## Remaining loose ends

- Curate the catalogue and labels further.
- Decide whether to add chains as a separate category or type.
- Consider adding more regional dishes and variants from `thoughts/food.md`.
- Consider a hide-eaten mode and sorting by label.
- Uploaded images are resized to at most 100KB before localStorage or Supabase persistence.
- Add focused automated coverage for multi-photo upload, selection, removal, and legacy-photo compatibility.
