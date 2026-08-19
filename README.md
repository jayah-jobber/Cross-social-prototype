# Social Post A/B Prototype

Interactive desktop prototype based on the supplied Figma frames.

```bash
cd prototype
npm install
npm run dev
```

Version 1 includes live message-body preview updates and drag-to-reorder image cards.
Version 2 is intentionally disabled until its design is added.

## Version 4 research builds

Research mode is compiled into the bundle and removes all prototype controls from
the DOM. It defaults to Version 4 and Arrow navigation; the deployment scripts
set every value explicitly:

- `VITE_PROTOTYPE_VERSION=version_4` locks the prototype to Version 4.
- `VITE_RESEARCH_MODE=true` enables the participant-safe research shell.
- `VITE_ENTRY_SURFACE=calendar|dashboard|adhoc` selects the initial product surface.
- `VITE_NAVIGATION_STYLE=arrows|icons` selects in-flow navigation. The legacy
  value `progress` maps to `icons`; research deployments remain fixed to `arrows`.

Build each deployment from the same immutable commit/tag:

```bash
npm run build:research:calendar
# publish dist/ as the Calendar deployment

npm run build:research:dashboard
# publish dist/ as the Dashboard deployment

npm run build:research:adhoc
# publish dist/ as the Ad-hoc deployment
```

Tag the reviewed source commit once, then configure both deployment jobs to
check out that exact tag and run their respective command. Do not rebuild one
variant from a later branch state: the environment variables should be the only
difference between the two artifacts.

Run the focused build/browser verification locally with:

```bash
npm run verify:research
```

The check builds and serves each research variant independently, verifies the
initial surface and Arrow channel flow, confirms prototype controls are absent,
asserts all six `/assets/v4-loading-*.svg` files were emitted, and then confirms
the normal development sandbox still renders its controls.
