/**
 * Information about request body types
 */
export interface RequestBodyTypeInfo {
  contentType: string;
  isRequired: boolean;
  typeImports: Set<string>;
  typeName: null | string;
}
