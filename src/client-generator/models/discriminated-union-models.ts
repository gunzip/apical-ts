/* Models for discriminated union response types */

/*
 * Represents a single response type component in a discriminated union
 */
export interface DiscriminatedResponseType {
  /* Content type (e.g., "application/json") */
  contentType: string | undefined;
  /* TypeScript type name for the data */
  dataType: string | undefined;
  /* HTTP status code */
  status: string;
}

/*
 * Configuration for generating discriminated union response types
 */
export interface DiscriminatedUnionConfig {
  /* Whether to include a parse method */
  includeParse: boolean;
  /* Operation ID for naming */
  operationId: string;
  /* Array of response type components */
  responseTypes: DiscriminatedResponseType[];
}

/*
 * Result of generating discriminated union types
 */
export interface DiscriminatedUnionResult {
  /* Generated response map name */
  responseMapName: string;
  /* Generated response map type */
  responseMapType: string;
  /* Type imports needed */
  typeImports: Set<string>;
  /* Generated union type definition */
  unionTypeDefinition: string;
  /* Generated union type name */
  unionTypeName: string;
}
