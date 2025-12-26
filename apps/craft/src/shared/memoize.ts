/**
 * Simple memoization utility using native Map for string-based functions
 * Lightweight alternative to memoizee with minimal overhead
 */
export function memoizeString<T>(
  fn: (input: string) => T,
  maxSize = 1000,
): (input: string) => T {
  const cache = new Map<string, T>();

  return (input: string): T => {
    if (cache.has(input)) {
      return cache.get(input)!;
    }

    const result = fn(input);

    // Simple LRU: if cache is full, remove first (oldest) entry
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(input, result);
    return result;
  };
}

/**
 * Simple memoization utility using WeakMap for object-based functions
 * Automatically garbage collected when objects are no longer referenced
 */
export function memoizeObject<T, R>(fn: (input: T) => R): (input: T) => R {
  const cache = new WeakMap<any, R>();

  return (input: T): R => {
    if (typeof input === "object" && input !== null) {
      if (cache.has(input)) {
        return cache.get(input)!;
      }

      const result = fn(input);
      cache.set(input as any, result);
      return result;
    }

    // Fallback for primitive types (shouldn't happen with proper typing)
    return fn(input);
  };
}
