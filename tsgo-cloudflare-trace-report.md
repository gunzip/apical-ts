# tsgo trace analysis for `local/app.local/definitions/cloudflare`

## Scope

- Trace source: `local/app.local/definitions/cloudflare/trace_*.json`
- Trace count analyzed: **206**
- Target workload: generated `schemas/`, `routes/`, and `client/` files for the
  Cloudflare definition set
- Relevant compiler shape: `strict: true`, `skipLibCheck: true`,
  `moduleResolution: "NodeNext"` from
  `local/app.local/definitions/cloudflare/tsconfig.json`

## Executive summary

The bottleneck is **not parsing or program creation**. tsgo spends most of its
time in **TypeScript structural type comparisons** while checking Zod-heavy
generated types.

The dominant checker operations are:

| Operation                 | Cumulative time |
| ------------------------- | --------------: |
| `structuredTypeRelatedTo` |   **2301.142s** |
| `getVariancesWorker`      |    **307.124s** |

Average `createProgram` time per trace is only **0.119s**.

Wall-clock `checkSourceFile` time by generated area:

| Area       |    Wall time |
| ---------- | -----------: |
| `schemas/` | **211.215s** |
| `client/`  | **102.426s** |
| `routes/`  | **101.566s** |
| other      |  **14.391s** |

## Highest-cost modules

The table below uses `checkSourceFile` wall time for the file itself.

| File                                                        |   Wall time |
| ----------------------------------------------------------- | ----------: |
| `client/KickPartcipants.ts`                                 | **32.227s** |
| `routes/GetSessionParticipants.ts`                          | **32.219s** |
| `client/MuteAllParticipants.ts`                             | **26.926s** |
| `routes/MembersDelete.ts`                                   | **25.284s** |
| `routes/MembersCreate.ts`                                   |  **6.801s** |
| `client/AccountsBatchMoveAccounts.ts`                       |  **6.785s** |
| `client/AccountsGetAccountProfile.ts`                       |  **6.747s** |
| `schemas/organizationsApiV4Message.ts`                      |  **6.663s** |
| `client/GetAbuseReport.ts`                                  |  **6.646s** |
| `schemas/rulesetsSetCacheControlDirective.ts`               |  **3.992s** |
| `schemas/rulesetsRewriteHeaders.ts`                         |  **3.797s** |
| `schemas/MuteAllParticipantsRequest.ts`                     |  **3.699s** |
| `schemas/rulesetsSetCacheControlDirectiveWithQualifiers.ts` |  **3.437s** |
| `schemas/zonesSetting.ts`                                   |  **2.389s** |
| `schemas/workersPlacementInfoNoStatus.ts`                   |  **2.313s** |

## Root causes

## 1. Response schema typing forces deep structural comparison of Zod types

The hottest path is the generic shape accepted by `parseApiResponseUnknownData`
in `local/app.local/definitions/cloudflare/client/config.ts:261-299`:

```ts
TSchemaMap extends Record<
  string,
  { safeParse: (value: unknown) => z.ZodSafeParseResult<unknown> }
>
```

Generated clients pass concrete response maps whose values are full Zod schemas.
TypeScript then repeatedly proves that large concrete `ZodObject<...>` instances
are compatible with the structural
`{ safeParse(...) => ZodSafeParseResult<unknown> }` contract.

The heaviest single trace events came from this path:

- `client/AccountsBatchMoveAccounts.ts`
- `client/AccountsGetAccountProfile.ts`

Representative comparisons:

- `ZodObject<...>` vs
  `{ safeParse: (value: unknown) => ZodSafeParseResult<unknown> }`
- `safeParse(...): ZodSafeParseResult<T>` vs
  `safeParse(...): ZodSafeParseResult<unknown>`
- `ZodSafeParseResult<T>`
- `ZodSafeParseError<T>`
- `ZodError<T>`
- `$ZodFormattedError<...>`

This is why the selected symbol `parseApiResponseUnknownData` is central to the
slowdown.

## 2. Generated client and route metadata amplify inference work

Three generated patterns are expensive together:

1. Client param aliases such as:
   - `client/KickPartcipants.ts:6`
   - `client/MuteAllParticipants.ts:6`
   - `client/AccountsBatchMoveAccounts.ts:6`
   - `client/AccountsGetAccountProfile.ts:6`

   These use:

   ```ts
   z.infer<NonNullable<typeof SomeClientRoute.params>>;
   ```

2. Route objects created by spreading `baseRoute` into `clientRoute` /
   `serverRoute`, for example:
   - `routes/GetSessionParticipants.ts:29-41`
   - `routes/MuteAllParticipants.ts:32-44`

3. Large conditional return types in generated client overloads.

The most expensive `checkExpression` spans were exactly these route/client
definitions:

- `routes/MuteAllParticipants.ts:32-37`
- `routes/GetSessionParticipants.ts:29-34`
- `schemas/GetSessionParticipantsParameters.ts:31-35`
- `client/MuteAllParticipants.ts:6`
- `client/KickPartcipants.ts:6`

This indicates that tsgo is not just paying for large schemas; it is also paying
for **how route metadata and inferred params are threaded through the generated
client API surface**.

## 3. Generated exclusive unions are checker-hostile

Several expensive schemas use the same pattern:

1. build a `z.union(...)`
2. attach `.superRefine(...)`
3. recreate the candidate schemas inside the refinement
4. call `schema.safeParse(x)` for each variant

Examples:

- `schemas/workersPlacementInfoNoStatus.ts:8-24`
- `schemas/workersPlacementInfo.ts:9-25`
- `schemas/rulesetsSetCacheControlDirective.ts:9-24`
- `schemas/rulesetsSetCacheControlDirectiveWithQualifiers.ts:9-24`
- `schemas/rulesetsRewriteHeaders.ts:10-15`

This pattern increases checker cost in two ways:

- it duplicates large schema expressions in the same file
- it forces repeated comparison of similar Zod generic instantiations
  (`ZodObject`, `ZodLiteral`, `ZodIntersection`, `ZodArray`, `refine`,
  `optional`, union/intersection wrappers)

Representative heavy type events from the schema traces:

- `schemas/workersPlacementInfoNoStatus.ts` repeatedly compares
  `ZodObject<...>`, `ZodLiteral<...>`, and the surrounding union/intersection
  wrappers
- `schemas/rulesetsSetCacheControlDirective.ts` repeatedly compares
  `ZodIntersection<...>`
- `schemas/cloudflarePipelinesStructField.ts` repeatedly compares
  `ZodArray<...>` and its optional/refined wrappers

## Why these hotspots matter

The biggest inclusive totals belong to files that combine the patterns above:

| File                                                        | Inclusive total |
| ----------------------------------------------------------- | --------------: |
| `schemas/rulesetsSetCacheControlDirective.ts`               |    **212.356s** |
| `schemas/GetSessionParticipantsParameters.ts`               |    **207.004s** |
| `schemas/rulesetsRewriteHeaders.ts`                         |    **206.292s** |
| `schemas/rulesetsSetCacheControlDirectiveWithQualifiers.ts` |    **187.532s** |
| `routes/MuteAllParticipants.ts`                             |    **161.289s** |
| `schemas/workersPlacementInfoNoStatus.ts`                   |    **132.885s** |
| `routes/GetSessionParticipants.ts`                          |    **127.327s** |
| `client/AccountsGetAccountProfile.ts`                       |    **122.033s** |
| `client/AccountsBatchMoveAccounts.ts`                       |    **108.055s** |

These totals are inclusive rather than wall-clock, but they show where the type
system does the most aggregate work.

## High-impact remediation plan

Only the highest-leverage tracks are worth prioritizing.

### A. Replace the structural `safeParse` contract with a lighter response-schema abstraction

Target:

- `client/config.ts`
- generators that emit response maps consumed by `parseApiResponseUnknownData`

Goal:

- avoid forcing TypeScript to compare full Zod schema structure against a
  structural `{ safeParse(...) }` contract
- reduce repeated instantiation of `ZodSafeParseResult<T>` / `ZodError<T>`
  relations

Promising directions:

- introduce a lightweight exported alias or branded interface for generated
  response schemas
- normalize response maps through a helper that hides the concrete Zod generic
  shape from call sites
- reduce structural typing pressure at the `parseApiResponseUnknownData`
  boundary

Expected impact:

- high impact on expensive generated clients such as `AccountsBatchMoveAccounts`
  and `AccountsGetAccountProfile`
- likely broad impact on every generated client response path

### B. Decouple generated client params and route metadata from full route-object inference

Target:

- route generation
- client generation

Goal:

- stop inferring client params from `typeof clientRoute.params`
- stop spreading large `baseRoute` objects into `clientRoute` / `serverRoute`
  when only a smaller typed surface is needed

Promising directions:

- emit dedicated `...ParsedParams` type aliases and use them directly in clients
- emit explicit route metadata types instead of letting `as const` + spread
  carry large inferred object types
- simplify overload signatures where possible to reduce conditional type
  propagation

Expected impact:

- high impact on the hottest route/client files
- especially relevant for files like `GetSessionParticipants`,
  `MuteAllParticipants`, and `KickPartcipants`

### C. Change union emission strategy for exclusive-object schemas

Target:

- schema generation for exclusive unions and object variants

Goal:

- avoid emitting `union(...).superRefine(...)` with an inline replay of
  `safeParse` across all variants

Promising directions:

- emit `z.discriminatedUnion(...)` when a stable discriminator exists
- otherwise use a reusable exclusivity helper instead of rebuilding candidate
  schema arrays inline
- avoid duplicating the same variant expressions in both the union and the
  refinement body

Expected impact:

- high impact on `rulesets*`, `workersPlacement*`, and similar object-union
  schemas
- should reduce both generated file size and checker work

## Recommended issue split

1. **Response-schema boundary simplification for `parseApiResponseUnknownData`**
2. **Generated route/client typing simplification**
3. **Union emission rewrite for exclusive Zod object unions**

That split maps cleanly to the observed hotspots and should be understandable to
a later coding agent without the original trace files.

## Tracking issues

1. [#167 Reduce structural type-check cost at parseApiResponseUnknownData response-schema boundaries](https://github.com/gunzip/apical-ts/issues/167)
2. [#168 Simplify generated route metadata and client param inference to reduce type-check overhead](https://github.com/gunzip/apical-ts/issues/168)
3. [#169 Rewrite checker-hostile oneOf/exclusive union emission to avoid repeated safeParse comparisons](https://github.com/gunzip/apical-ts/issues/169)
