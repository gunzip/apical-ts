/*
 * Keep the bundled parameter schema module in snake_case so it cannot collide
 * with user schema modules, which are generated via sanitizeIdentifier().
 */
export const PARAMETER_SCHEMA_BUNDLE_BASE_NAME =
  "__apical_generated_parameters";

export const PARAMETER_SCHEMA_BUNDLE_FILE_NAME = `${PARAMETER_SCHEMA_BUNDLE_BASE_NAME}.ts`;

export const LEGACY_PARAMETER_SCHEMA_BUNDLE_FILE_NAMES = [
  "parameters.ts",
] as const;
