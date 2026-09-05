# Initial architecture

## Decision

Build a mobile-first Nuxt website backed by Supabase and deploy the generated static site to GitHub Pages.

## Reasons

- Vue is the preferred frontend framework.
- Nuxt provides routing and application structure with little boilerplate.
- Supabase provides authentication, database storage, and photo storage.
- GitHub Pages keeps hosting simple and inexpensive for a static frontend.

## Constraints

- Nuxt server routes and server-only secrets cannot run on GitHub Pages.
- Supabase Row Level Security must protect user-owned data.
- Any required backend work should use Supabase features such as Edge Functions.
