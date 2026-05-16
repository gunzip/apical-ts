# Piano di Implementazione — Issue #168 & #169

## Problema

Il codice generato da apical-ts produce pattern costosi per il type-checker
TypeScript/tsgo:

1. **#168 — Route metadata e client param inference**: i client generati usano
   `z.infer<NonNullable<typeof clientRoute.params>>` e spread `...baseRoute` con
   `as const`, causando catene di inferenza costose (fino a 32s per file).
2. **#169 — oneOf/exclusive union emission**: la strategia corrente duplica i
   variant schema sia nel `z.union([...])` sia nel corpo `.superRefine(...)` con
   `safeParse` su ognuno, creando lavoro strutturale enorme (fino a 212s per
   file).

## Approccio

### Issue #169 — Riscrittura emissione oneOf (priorità alta, scope isolato)

L'intervento è localizzato in
`packages/core-utils/src/schema-generator/union-types.ts` (righe 267-284).

#### TODO

- **169-helper-fn**: Creare una funzione helper runtime `exclusiveUnion`
  riutilizzabile, emessa una sola volta dal generatore (o importata da un modulo
  condiviso), che accetta un array di schema e valida "exactly one match" senza
  duplicare le espressioni dei variant inline.
- **169-emit-refactor**: Modificare `handleUnionSchema` (ramo `oneOf`) per
  emettere un riferimento all'helper + array dei variant, invece di duplicarli
  nel `.superRefine(...)`.
- **169-discriminated-fast-path**: Verificare e rafforzare il percorso
  `z.discriminatedUnion(...)` — quando un discriminatore stabile è
  individuabile, saltare completamente la superRefine.
- **169-tests**: Aggiungere test di regressione per exclusive union (oggetti
  complessi tipo `rulesets*`/`workersPlacement*`), verificando che il codice
  generato:
  - Non duplichi le espressioni dei variant
  - Mantenga la semantica "exactly one match"
  - Usi `z.discriminatedUnion` quando possibile
- **169-integration**: Verificare che i test d'integrazione esistenti in
  `apps/craft/tests/integrations/` continuino a passare.

#### File coinvolti

| File                                                              | Modifica                             |
| ----------------------------------------------------------------- | ------------------------------------ |
| `packages/core-utils/src/schema-generator/union-types.ts`         | Riscrivere ramo `oneOf` (L267-284)   |
| `packages/core-utils/src/schema-generator/discriminated-union.ts` | Possibili miglioramenti al fast-path |
| `packages/core-utils/tests/zod-schema-to-code.test.ts`            | Aggiungere test oneOf                |
| Nuovo file helper runtime (da decidere localizzazione)            | Funzione `exclusiveUnion`            |

---

### Issue #168 — Semplificazione route metadata e client params (scope più ampio)

L'intervento coinvolge 3 package: `route-generator`, `client-generator` e
`core-utils`.

#### TODO

- **168-direct-type-alias**: Nel client generator, smettere di usare
  `z.infer<NonNullable<typeof clientRoute.params>>` — emettere direttamente un
  type alias dal file dei parametri (che già esporta `ParsedParamsType`).
- **168-route-metadata-simplify**: Nel route metadata template, eliminare il
  pattern `baseRoute` spread + `as const`. Emettere direttamente `clientRoute` e
  `serverRoute` come oggetti literal const senza eredità da baseRoute.
- **168-client-overloads**: Rivedere le 3 overload signatures nel template
  operazione — valutare se il generic `TForceValidation` può essere semplificato
  o se le overload possono essere ridotte.
- **168-tests-route**: Aggiornare test in `packages/route-generator/tests/` per
  riflettere il nuovo output.
- **168-tests-client**: Aggiornare/aggiungere test in
  `packages/client-generator/` per il nuovo pattern di type alias.
- **168-integration**: Verificare che i test end-to-end in
  `apps/craft/tests/integrations/` continuino a passare.
- **168-snapshot-update**: Aggiornare eventuali snapshot/fixture nella test
  suite e in `apps/examples/generated/`.

#### File coinvolti

| File                                                                   | Modifica                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `packages/route-generator/src/templates/route-metadata-templates.ts`   | Eliminare baseRoute spread                                    |
| `packages/client-generator/src/templates/operation-templates.ts`       | Sostituire `z.infer<NonNullable<...>>` con type alias diretto |
| `packages/core-utils/src/schema-generator/parameter-file-generator.ts` | Verificare che esporti tipi utilizzabili direttamente         |
| `packages/route-generator/tests/file-writer.test.ts`                   | Aggiornare asserzioni                                         |
| `packages/route-generator/tests/route-metadata-generator.test.ts`      | Aggiornare asserzioni                                         |
| `apps/craft/tests/integrations/`                                       | Validazione end-to-end                                        |

---

## Ordine di esecuzione

1. **#169 prima** — scope contenuto, rischio basso, beneficio enorme (i file
   schema sono i più costosi in assoluto).
2. **#168 dopo** — scope più ampio, dipendenze cross-package, richiede
   aggiornamento snapshot.

## Criteri di accettazione

- ✅ `pnpm test` passa in tutti i workspace
- ✅ `pnpm typecheck` passa senza errori
- ✅ `pnpm lint:check` e `pnpm format:check` passano
- ✅ Output generato mantiene retrocompatibilità comportamentale (o le breaking
  change sono documentate)
- ✅ Nessuna duplicazione di espressioni schema nel codice oneOf generato
- ✅ Client params non dipendono più da inference chain via
  `typeof clientRoute.params`

## Note

- La funzione helper `exclusiveUnion` potrebbe vivere in
  `packages/core-utils/src/runtime/` come export del pacchetto, oppure essere
  emessa inline una sola volta nel file `schemas/index.ts` generato.
- Per #168, il `ParsedParamsType` esportato dal parameter-file-generator è già
  disponibile — serve solo redirigere il client a usarlo.
- Le overload con `TForceValidation` in #168 richiedono un'analisi d'impatto sui
  consumer prima di essere semplificate.
