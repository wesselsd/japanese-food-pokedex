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

### To kill stale node processes 

```bash
Get-Process node |  Stop-Process -Force
```
