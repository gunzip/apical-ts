---
"@apical-ts/route-generator": patch
"@apical-ts/core-utils": patch
"@apical-ts/craft": patch
---

Fix typecheck failures on specs with parameterized media types or case-colliding
operation IDs

Two generator bugs made the generated client/server fail `tsc` (TS2678 / TS2724
/ TS1149):

- Route request maps corrupted content-type keys containing `;` (e.g.
  `text/plain;charset=UTF-8` became `text/plain,charset=UTF-8`) when converting
  the type-shape map into an object literal via `replaceAll(";", ",")`. The
  request map keys no longer matched the client's content-type switch cases, so
  `case` expressions were not comparable to `keyof RequestMap`. The conversion
  now only rewrites statement-terminating semicolons (end of line), preserving
  semicolons inside quoted keys.
- Operation IDs whose sanitized identifiers collide only by casing (e.g.
  `DeleteWebhook` vs `deleteWebhook`) produced function/file names that clash on
  case-insensitive filesystems and failed typechecking with TS1149. A new
  `renameSanitizationConflictingOperationIds` preprocess step renames the
  colliding operation IDs deterministically with a numeric suffix (mirroring the
  existing schema conflict handling), so client, server, routes, schemas and
  index barrels stay consistent. The step is a single linear pass over
  operations (O(n), plus a tiny per-collision-group sort), so it adds no
  meaningful cost even for very large specifications.
