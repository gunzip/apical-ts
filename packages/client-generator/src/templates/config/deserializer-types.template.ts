/* Deserializer type definitions */

/*
 * Renders deserializer type definitions
 */
export function renderDeserializerTypes(): string {
  return `/* Type definitions for pluggable deserialization */
export type Deserializer = (data: unknown, contentType?: string) => unknown;
export type DeserializerMap = Record<string, Deserializer>;`;
}
