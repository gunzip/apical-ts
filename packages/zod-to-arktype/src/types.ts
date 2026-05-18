export interface ConvertOptions {
  from: "zod";
  to: "arktype";
  input: string;
  output: string;
}

export interface ZodSchemaDeclaration {
  name: string;
  isExported: boolean;
  hasTypeExport: boolean;
  callChain: ZodCallNode;
}

export interface ZodTypeAlias {
  name: string;
  referencedConst: string;
  isExported: boolean;
}

export interface ZodExportedName {
  name: string;
}

export type ZodCallNode = ZodMethodCall | ZodIdentifierRef | ZodPropertyAccess;

export interface ZodMethodCall {
  kind: "call";
  method: string;
  object?: ZodCallNode;
  args: ZodArg[];
}

export interface ZodIdentifierRef {
  kind: "identifier";
  name: string;
}

export interface ZodPropertyAccess {
  kind: "property";
  object: ZodCallNode;
  property: string;
}

export type ZodArg =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" }
  | { kind: "array"; elements: ZodArg[] }
  | { kind: "object"; properties: ZodObjectProperty[] }
  | { kind: "call"; node: ZodCallNode }
  | { kind: "arrow"; bodyNode: ZodCallNode }
  | { kind: "identifier"; name: string }
  | { kind: "spread"; node: ZodCallNode; property?: string };

export interface ZodObjectProperty {
  key: string;
  value: ZodCallNode;
}

export interface ConversionResult {
  code: string;
  needsTypeImport: boolean;
  referencedSchemas: Set<string>;
}

export interface FileConversionError {
  filePath: string;
  errors: string[];
}

export interface ConversionSummary {
  totalCount: number;
  successCount: number;
  errors: FileConversionError[];
}
