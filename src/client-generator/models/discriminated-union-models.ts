/* Models for discriminated union response types */

/*
 * Represents a single response type component in a discriminated union
 */
export interface DiscriminatedResponseType {
  /* HTTP status code */
  status: string;
  /* Content type (e.g., "application/json") */
  contentType: string;
  /* TypeScript type name for the data */
  dataType: string;
}

/*
 * Configuration for generating discriminated union response types
 */
export interface DiscriminatedUnionConfig {
  /* Operation ID for naming */
  operationId: string;
  /* Array of response type components */
  responseTypes: DiscriminatedResponseType[];
  /* Whether to include a parse method */
  includeParse: boolean;
}

/*
 * Result of generating discriminated union types
 */
export interface DiscriminatedUnionResult {
  /* Generated union type name */
  unionTypeName: string;
  /* Generated union type definition */
  unionTypeDefinition: string;
  /* Generated response map type */
  responseMapType: string;
  /* Generated response map name */
  responseMapName: string;
  /* Type imports needed */
  typeImports: Set<string>;
}