# Cross Social Prototype — Version 4

Interactive React prototype for the horizontal Version 4 social-post creation workflow.

## Run locally

```bash
npm install
npm run dev
```

This branch is locked to Version 4 by default. Set `VITE_PROTOTYPE_VERSION=version_5`
only when explicitly testing the shared Version 5 implementation.

## Frozen Version 4 research builds

Research mode removes prototype controls from the DOM and fixes participant
entry/navigation through build-time configuration:

- `VITE_PROTOTYPE_VERSION=version_4`
- `VITE_RESEARCH_MODE=true`
- `VITE_ENTRY_SURFACE=calendar|dashboard`
- `VITE_NAVIGATION_STYLE=arrows|progress`

Build the two Arrow-navigation participant variants from the same immutable tag:

```bash
npm run build:research:calendar
npm run build:research:dashboard
```

Run `npm run verify:research` before deployment. Publish each build as a separate
manual Vercel project and retain its immutable deployment URL so future sandbox
changes cannot alter an active research session.
