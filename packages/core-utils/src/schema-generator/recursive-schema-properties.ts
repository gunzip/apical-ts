import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode } from "../shared/types.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./types.js";

import { findReferencesInSchema } from "./recursive-handlers.js";
import { getSchemaNameFromReference } from "./schema-references.js";
import { zodSchemaToCode } from "./schema-converter.js";

interface BuildRecursiveShapeOptions {
  extraProps?: ExtraPropsMode;
  formatOverrides?: StringFormatOverrideRegistry;
  name: string;
  originalSchemaName: string;
  recursiveContext: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  schema: SchemaObject;
}

interface RecursivePropertyCodeOptions extends Omit<
  BuildRecursiveShapeOptions,
  "schema"
> {
  imports: Set<string>;
  isRequired: boolean;
  key: string;
  propSchema: ReferenceObject | SchemaObject;
}

export function buildRecursiveShape(options: BuildRecursiveShapeOptions): {
  imports: Set<string>;
  shape: string[];
} {
  const { schema } = options;
  const shape: string[] = [];
  const imports = new Set<string>();
  const requiredFields = new Set(schema.required ?? []);

  for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
    shape.push(
      generateRecursivePropertyCode({
        ...options,
        imports,
        isRequired: requiredFields.has(key),
        key,
        propSchema,
      }),
    );
  }

  return { imports, shape };
}

/* Exported for targeted getter tests. */
export function generateGetterCode(
  key: string,
  propSchema: ReferenceObject | SchemaObject,
  name: string,
  isRequired: boolean,
): string {
  const referencedSchemaName = getRecursiveReferenceName(propSchema) ?? name;
  const isCrossSchemaReference = referencedSchemaName !== name;
  const baseGetter = (code: string, returnType: string) =>
    `get ${JSON.stringify(key)}(): ${returnType} { return ${code}${isRequired ? "" : ".optional()"}; }`;

  if (
    !isReferenceObject(propSchema) &&
    propSchema.type === "array" &&
    propSchema.items &&
    isReferenceObject(propSchema.items)
  ) {
    const arrayItemType = isCrossSchemaReference
      ? "z.ZodTypeAny"
      : `typeof ${referencedSchemaName}`;
    const returnType = isRequired
      ? `z.ZodArray<${arrayItemType}>`
      : `z.ZodOptional<z.ZodArray<${arrayItemType}>>`;
    return baseGetter(`z.array(${referencedSchemaName})`, returnType);
  }

  const returnType = isRequired
    ? isCrossSchemaReference
      ? "z.ZodTypeAny"
      : `typeof ${referencedSchemaName}`
    : isCrossSchemaReference
      ? "z.ZodOptional<z.ZodTypeAny>"
      : `z.ZodOptional<typeof ${referencedSchemaName}>`;
  return baseGetter(referencedSchemaName, returnType);
}

function generateRecursivePropertyCode(
  options: RecursivePropertyCodeOptions,
): string {
  const { imports, isRequired, key, name, propSchema } = options;

  if (
    !isRecursiveProperty(
      propSchema,
      options.originalSchemaName,
      options.recursiveContext,
    )
  ) {
    return generateRegularPropertyCode(options);
  }

  const referencedSchemaName = getRecursiveReferenceName(propSchema);
  if (referencedSchemaName) {
    addImport(imports, referencedSchemaName, name);
    return generateGetterCode(key, propSchema, name, isRequired);
  }

  const propertyResult = zodSchemaToCode(propSchema, {
    currentSchemaName: name,
    extraProps: options.extraProps,
    formatOverrides: options.formatOverrides,
    imports: new Set(),
    recursiveContext: options.recursiveContext,
    resolvedSchemas: options.resolvedSchemas,
  });
  addImports(imports, propertyResult.imports, name);

  const code = wrapOptional(propertyResult.code, isRequired);
  const returnType = getRecursiveCompositionReturnType(
    propSchema,
    name,
    isRequired,
  );
  return `get ${JSON.stringify(key)}(): ${returnType} { return ${code}; }`;
}

function generateRegularPropertyCode(
  options: RecursivePropertyCodeOptions,
): string {
  const propertyResult = zodSchemaToCode(options.propSchema, {
    currentSchemaName: options.name,
    extraProps: options.extraProps,
    formatOverrides: options.formatOverrides,
    imports: new Set(),
    recursiveContext: options.recursiveContext,
    resolvedSchemas: options.resolvedSchemas,
  });
  addImports(options.imports, propertyResult.imports, options.name);

  return `${JSON.stringify(options.key)}: ${wrapOptional(propertyResult.code, options.isRequired)}`;
}

function addImport(
  imports: Set<string>,
  importName: string,
  currentSchemaName: string,
): void {
  if (importName !== currentSchemaName) {
    imports.add(importName);
  }
}

function addImports(
  imports: Set<string>,
  propertyImports: Set<string>,
  currentSchemaName: string,
): void {
  propertyImports.forEach((importName) =>
    addImport(imports, importName, currentSchemaName),
  );
}

function wrapOptional(code: string, isRequired: boolean): string {
  return isRequired ? code : `${code}.optional()`;
}

function getRecursiveCompositionReturnType(
  propSchema: ReferenceObject | SchemaObject,
  schemaName: string,
  isRequired: boolean,
): string {
  const compositionItems = isReferenceObject(propSchema)
    ? undefined
    : (propSchema.allOf ?? propSchema.anyOf ?? propSchema.oneOf);
  const singleRefTarget =
    compositionItems?.length === 1 && isReferenceObject(compositionItems[0])
      ? getSchemaNameFromReference(compositionItems[0].$ref)
      : undefined;
  const baseType =
    singleRefTarget === schemaName
      ? `z.ZodLazy<typeof ${schemaName}>`
      : "z.ZodTypeAny";

  return isRequired ? baseType : `z.ZodOptional<${baseType}>`;
}

function isRecursiveProperty(
  propSchema: ReferenceObject | SchemaObject,
  originalSchemaName: string,
  recursiveContext: RecursiveContext,
): boolean {
  if ("$ref" in propSchema) {
    const ref = propSchema.$ref;
    if (!ref) {
      return false;
    }

    const selfRef = `#/components/schemas/${originalSchemaName}`;
    const shortSelfRef = `#/${originalSchemaName}`;
    if (ref === selfRef || ref === shortSelfRef) {
      return true;
    }

    const referencedSchema = getSchemaNameFromReference(ref);
    return !!(
      referencedSchema &&
      recursiveContext.recursiveSchemas.has(referencedSchema)
    );
  }

  const refs = findReferencesInSchema(propSchema);
  const selfRef = `#/components/schemas/${originalSchemaName}`;
  const shortSelfRef = `#/${originalSchemaName}`;
  return refs.some((ref) => {
    if (ref === selfRef || ref === shortSelfRef) {
      return true;
    }

    const referencedSchema = getSchemaNameFromReference(ref);
    return !!(
      referencedSchema &&
      recursiveContext.recursiveSchemas.has(referencedSchema)
    );
  });
}

function getRecursiveReferenceName(
  propSchema: ReferenceObject | SchemaObject,
): string | undefined {
  if (isReferenceObject(propSchema)) {
    return getSchemaNameFromReference(propSchema.$ref);
  }

  if (
    propSchema.type === "array" &&
    propSchema.items &&
    isReferenceObject(propSchema.items)
  ) {
    return getSchemaNameFromReference(propSchema.items.$ref);
  }

  return undefined;
}
