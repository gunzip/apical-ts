---
"@apical-ts/craft": major
---

## Breaking changes

- The generated `GlobalConfig.headers` now only accepts the declared auth header
  keys. Supplying fewer keys or injecting arbitrary default headers now fails
  type-checking, so update your configuration factories to fill every generated
  key and push ad-hoc headers through `params.headers` instead of
  `config.headers`.
- Optional parameters: `query`/`headers`/`path` properties only appear in client
  calls when the OpenAPI spec actually defined them.

## Migration guidance

1. Regenerate your client/server and update any helper that builds
   `globalConfig` so it hydrates all generated auth headers (you can store
   credentials elsewhere and spread them in).
2. Refactor call sites that invoked operations without arguments to pass an
   explicit params object, and update code that assumed
   `params.path/query/headers` were always present.
3. Adjust server handlers to handle the new optional param sections (or
   destructure with defaults) before referencing them.
