---
"@apical-ts/craft": patch
"@apical-ts/core-utils": patch
"@apical-ts/route-generator": patch
---

Keep inherited auth headers in generated route params: optional on client
operations and required on server handlers unless an operation-level security
override replaces them.
