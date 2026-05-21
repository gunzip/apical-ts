/* Operation binding utilities */

/*
 * Renders operation binding utilities
 */
export function renderOperationUtilities(): string {
  return `/* Utility types for operation binding */
type Operation = (...args: any[]) => any;

/* Extract the specific overload matching the provided forceValidation literal.
 * If an overload exists with that exact config type, we bind to its return type; otherwise
 * we fall back to the generic signature (last overload) and post-process ApiResponseWithParse
 * variants when forceValidation === true to their forced counterparts.
 */
type ExtractOverloadForForce<TOp, TForce extends boolean> = Extract<
  TOp,
  (params: any, config: { forceValidation: TForce } & GlobalConfig) => any
> extends (params: infer P, config: any) => infer R
  ? (params: P) => R
  : TOp extends (params: infer P, config?: any) => infer R
  ? (params: P) => R
  : never;

// Distribute over unions and replace ApiResponseWithParse members when forceValidation=true
type ReplaceWithForcedParse<U> = U extends any
  ? U extends ApiResponseWithParse<infer S, infer Map, infer HeaderMap>
    ? ApiResponseWithForcedParse<S, Map, HeaderMap>
    : U
  : never;

// When forceValidation is false we remove any forced-parse variants so consumers
// only see the manual parse() shape; this improves DX (parse() becomes available
// after narrowing success/status without additional guards).
type RemoveForcedParse<U> = U extends any
  ? U extends ApiResponseWithForcedParse<any, any, any>
    ? never
    : U
  : never;

type ForceAdjust<R, TForce extends boolean> = TForce extends true
  ? R extends Promise<infer U>
    ? Promise<ReplaceWithForcedParse<U>>
    : ReplaceWithForcedParse<R>
  : R extends Promise<infer U>
    ? Promise<RemoveForcedParse<U>>
    : RemoveForcedParse<R>;

type BoundOperation<TOp, TForce extends boolean> = ForceAdjust<
  ExtractOverloadForForce<TOp, TForce> extends (params: any) => infer R ? R : never,
  TForce
> extends infer Adjusted
  ? ExtractOverloadForForce<TOp, TForce> extends (params: infer P) => any
    ? (params: P) => Adjusted
    : never
  : never;

export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: Omit<GlobalConfig, 'forceValidation'> & { forceValidation: true }
): { [K in keyof TOperations]: BoundOperation<TOperations[K], true> };
export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: Omit<GlobalConfig, 'forceValidation'> & { forceValidation: false }
): { [K in keyof TOperations]: BoundOperation<TOperations[K], false> };
export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: Omit<GlobalConfig, 'forceValidation'>
): { [K in keyof TOperations]: BoundOperation<TOperations[K], true> };
export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: (Omit<GlobalConfig, 'forceValidation'> & { forceValidation: boolean }) | Omit<GlobalConfig, 'forceValidation'>
): { [K in keyof TOperations]: BoundOperation<TOperations[K], boolean> } {
  const bound: Partial<Record<keyof TOperations, (params: unknown) => unknown>> = {};
  for (const key in operations) {
    const op = operations[key];
    /* Preserve runtime guard (test expects the string below to appear) */
    if (typeof operations[key] === 'function') {
      bound[key] = (params: unknown) => {
        return (op as (...args: any[]) => unknown)(params, config);
      };
    }
  }
  /* Cast through satisfies to keep key mapping precise while avoiding any */
  return bound as { [K in keyof TOperations]: BoundOperation<TOperations[K], boolean> };
}`;
}
