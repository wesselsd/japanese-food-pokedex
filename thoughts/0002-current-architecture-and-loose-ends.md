# Current architecture and loose ends

Updated 2026-09-06.

## Product

Japanese Food Pokedex is a mobile-first static web app for browsing Japanese foods, marking foods as eaten, and saving a personal photo for each food. The current catalogue contains 50 non-chain foods. Chains and drinks are planned for later.

## Architecture

- `pokedex/` contains the Nuxt application.
- Nuxt 3 runs as an SPA (`ssr: false`) and is generated as static output for GitHub Pages.
- Vue UI is in `pokedex/app.vue`.
- Food catalogue data is in `pokedex/data/foods.ts`.
- Catalogue filtering, eaten state, photo cropping, and compression are in `pokedex/composables/useFoodPokedex.ts`.
- Authentication state is in `pokedex/composables/useAuth.ts`.
- Supabase-specific code is isolated in `pokedex/adapter/supabase/`.
- Supabase provides email/password authentication, the `foods` table, per-user progress, and private photo storage.
- RLS policies scope `user_foods` rows and stored photos to the authenticated user.
- Signed-in users synchronize progress and photos through Supabase; signed-out users use localStorage for eaten state and browser-local photo state.
- The app is deployed automatically from `main` using `.github/workflows/deploy-pages.yml` to `https://wesselsd.github.io/japanese-food-pokedex/`.

## Food artwork

- Generated artwork is stored in `pokedex/assets/images/`.
- Every catalogue item currently has a matching `<food-id>_image.png`.
- `pokedex/data/foods.ts` discovers these files with `import.meta.glob`.
- Card image priority is user-uploaded photo, generated catalogue artwork, then emoji fallback.
- `pokedex/scripts/food_gen.py` generates missing artwork into `pokedex/assets/images/` using a path relative to the script location. It must not be run automatically.

## Data and migrations

Run these migrations in order in Supabase:

1. `20260905205000_create_foods.sql`
2. `20260905211500_create_user_progress.sql`
3. `20260905223000_expand_food_catalog_and_tags.sql`

The catalogue migration changes the original single `category` column into `categories text[]` and seeds the current 50 foods. The frontend currently uses the local TypeScript catalogue as its display source; Supabase is not yet the runtime source for food metadata.

## Validation

From `pokedex/`:

```text
npm test
npm run test:integration
npm run generate
```

The integration test requires the local `.env` Supabase configuration and an accessible migrated database.

## Loose ends from `thoughts/todo.md`

- Add an eaten/uneaten filter.
- Make categories more useful and show category-specific progress.
- Trim tags and introduce an `Essential` tag containing about 25 entries.
- Curate the catalogue.
- Decide whether catalogue data should move to JSON or another configuration format.
- Support selecting, replacing, removing, and possibly storing multiple images and image metadata.
- Add an option to hide eaten items, defaulting to hidden unless all foods have been eaten.
- Add sorting by label.

## Future catalogue work

- Add chains as a separate category or type.
- Add drinks later.
- Consider adding more carefully curated regional dishes and variants from `thoughts/food.md`.
- Keep the eventual combined food-and-chain catalogue near the original target of approximately 150 items.
