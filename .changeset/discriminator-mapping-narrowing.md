---
"@apical-ts/core-utils": patch
"@apical-ts/craft": patch
---

fix: narrow discriminator mapping members without const/enum so generated
`z.discriminatedUnion` options no longer throw "Invalid discriminated union
option" at runtime
