import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";
import { isSchemaObject } from "openapi3-ts/oas31";

import { shouldIncludeProperty } from "../shared/types.js";
import type {
  GeneratedSchemaHelper,
  ZodSchemaCodeOptions,
  ZodSchemaResult,
} from "./types.js";
import { generateObjectCode } from "./object-properties.js";
import {
  generatePatternPropertiesValueCode,
  generatePropertyNamesKeyCode,
  generateRecordCode,
  getPatternProperties,
} from "./pattern-properties.js";
import { addDefaultValue, addDescription } from "./utils.js";

/**
 * Handle object type conversion
 */
export function handleObjectType(
  schema: SchemaObject,
  result: ZodSchemaResult,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: Omit<ZodSchemaCodeOptions, "imports" | "isTopLevel"> = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    extraProps,
    recursiveContext,
    resolvedSchemas,
    schemaContext = "base",
  } = options;
  const shape: string[] = [];
  const requiredFields = schema.required || [];

  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      /* Filter properties based on schema context (readOnly/writeOnly) */
      if (!shouldIncludeProperty(propSchema, schemaContext)) {
        continue;
      }

      const propResult = zodSchemaToCode(propSchema, {
        currentSchemaName,
        helpers: result.helpers,
        imports: result.imports,
        formatOverrides: options.formatOverrides,
        recursiveContext,
        resolvedSchemas,
        schemaContext,
        skipDescription: true,
      });
      result.imports = new Set([...propResult.imports, ...result.imports]);

      const isRequired = requiredFields.includes(key);
      let propCode = isRequired
        ? propResult.code
        : `${propResult.code}.optional()`;

      if (isSchemaObject(propSchema)) {
        propCode = addDescription(propCode, propSchema.description);
      }

      shape.push(`${JSON.stringify(key)}: ${propCode}`);
    }
  }

  const patternProperties = getPatternProperties(schema);
  const codeOptions: ZodSchemaCodeOptions = {
    currentSchemaName,
    extraProps,
    formatOverrides: options.formatOverrides,
    imports: result.imports,
    recursiveContext,
    resolvedSchemas,
  };

  /*
   * When patternProperties or propertyNames are present without named properties,
   * generate a z.record(...) schema instead of z.object({}).
   */
  if (
    shape.length === 0 &&
    !schema.properties &&
    (patternProperties || schema.propertyNames)
  ) {
    const recordResult = generateRecordFromPatterns(
      schema,
      patternProperties,
      zodSchemaToCode,
      codeOptions,
    );
    result.helpers = recordResult.helpers;
    result.imports = recordResult.imports;
    let code = recordResult.code;
    code = addDefaultValue(code, schema.default, { schemaType: "object" });
    result.code = code;
    return result;
  }

  /*
   * When named properties exist alongside patternProperties, use the pattern
   * value schema as the catchall (overriding additionalProperties if not explicitly set).
   */
  const effectiveAdditionalProperties = resolveAdditionalProperties(
    schema.additionalProperties,
    patternProperties,
  );

  const objectCodeResult = generateObjectCode(
    shape,
    effectiveAdditionalProperties,
    zodSchemaToCode,
    {
      currentSchemaName,
      extraProps,
      formatOverrides: options.formatOverrides,
      helpers: result.helpers,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
    },
  );

  result.helpers = objectCodeResult.helpers;
  result.imports = objectCodeResult.imports;
  let code = objectCodeResult.code;

  code = addDefaultValue(code, schema.default, { schemaType: "object" });

  result.code = code;
  return result;
}

/*
 * Generate a z.record() schema from patternProperties and/or propertyNames
 * when no named properties are present.
 */
function generateRecordFromPatterns(
  schema: SchemaObject,
  patternProperties: Record<string, ReferenceObject | SchemaObject> | undefined,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: ZodSchemaCodeOptions,
): {
  code: string;
  helpers: Set<GeneratedSchemaHelper>;
  imports: Set<string>;
} {
  const helpers = options.helpers || new Set<GeneratedSchemaHelper>();
  const imports = options.imports || new Set<string>();

  let valueCode = "z.unknown()";
  let keyCode = "z.string()";
  let refinement: string | undefined;

  /* Derive value type from patternProperties */
  if (patternProperties) {
    const ppResult = generatePatternPropertiesValueCode(
      patternProperties,
      zodSchemaToCode,
      { ...options, helpers, imports },
    );
    valueCode = ppResult.valueCode;
    keyCode = ppResult.keyCode;
    refinement = ppResult.refinement;
    for (const helper of ppResult.helpers) {
      helpers.add(helper);
    }
    for (const imp of ppResult.imports) {
      imports.add(imp);
    }
  }

  /* Derive key constraint from propertyNames */
  if (schema.propertyNames) {
    const keyResult = generatePropertyNamesKeyCode(
      schema.propertyNames,
      zodSchemaToCode,
      { ...options, helpers, imports },
    );
    keyCode = keyResult.code;
    for (const helper of keyResult.helpers) {
      helpers.add(helper);
    }
    for (const imp of keyResult.imports) {
      imports.add(imp);
    }
  }

  /*
   * If additionalProperties is explicitly a schema and no patternProperties
   * provided a value, use the additionalProperties schema as the value.
   */
  if (!patternProperties && requiresValueSchema(schema.additionalProperties)) {
    const addResult = zodSchemaToCode(schema.additionalProperties, {
      currentSchemaName: options.currentSchemaName,
      formatOverrides: options.formatOverrides,
      helpers,
      imports,
      recursiveContext: options.recursiveContext,
      resolvedSchemas: options.resolvedSchemas,
      skipDescription: true,
    });
    valueCode = addResult.code;
    for (const helper of addResult.helpers) {
      helpers.add(helper);
    }
    for (const imp of addResult.imports) {
      imports.add(imp);
    }
  }

  return {
    code: generateRecordCode({ keyCode, refinement, valueCode }),
    helpers,
    imports,
  };
}

/*
 * When patternProperties exist alongside named properties and additionalProperties
 * is not explicitly set, synthesize an additionalProperties schema object whose
 * value type matches the merged patternProperties value schemas.
 *
 * This causes generateObjectCode to emit a .catchall(...) with the correct type
 * rather than degrading to z.unknown() or applying extraProps defaults.
 */
function resolveAdditionalProperties(
  additionalProperties: SchemaObject["additionalProperties"],
  patternProperties: Record<string, ReferenceObject | SchemaObject> | undefined,
): SchemaObject["additionalProperties"] {
  /* If additionalProperties is explicitly set, honour it */
  if (additionalProperties !== undefined) {
    return additionalProperties;
  }

  /* No patternProperties — fall through to default behavior */
  if (!patternProperties) {
    return additionalProperties;
  }

  /*
   * Synthesize a schema that generateObjectCode will pass through zodSchemaToCode
   * to produce the correct catchall. We use an anyOf wrapper when multiple pattern
   * schemas exist, or the single schema directly.
   */
  const valueSchemas = Object.values(patternProperties);
  if (valueSchemas.length === 1) {
    return valueSchemas[0];
  }

  return { anyOf: valueSchemas } as SchemaObject;
}

function requiresValueSchema(
  additionalProperties: SchemaObject["additionalProperties"],
): additionalProperties is ReferenceObject | SchemaObject {
  return (
    additionalProperties !== undefined &&
    additionalProperties !== false &&
    additionalProperties !== true &&
    typeof additionalProperties === "object"
  );
}
