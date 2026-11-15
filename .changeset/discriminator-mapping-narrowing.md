---
"@apical-ts/core-utils": patch
"@apical-ts/craft": patch
---

Narrow `discriminator.mapping` members that lack an explicit `const`/`enum` on
the discriminator property, so generated `z.discriminatedUnion` options no
longer throw "Invalid discriminated union option" at runtime.
