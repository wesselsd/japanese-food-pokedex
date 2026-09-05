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

### To kill stale node processes 

```bash
Get-Process node |  Stop-Process -Force
```
