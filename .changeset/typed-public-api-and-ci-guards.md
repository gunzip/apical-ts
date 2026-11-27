---
"@apical-ts/craft": minor
---

Ship TypeScript declarations for the published package and tighten CI guards.

- `dist` now contains `.d.mts` declarations, and `package.json` exposes
  `types`/`exports` for both the CLI entry point and the programmatic
  `@apical-ts/craft/generate` entry point.
- `--extra-props` rejects unknown values at parse time instead of silently
  falling back to the default behaviour.
