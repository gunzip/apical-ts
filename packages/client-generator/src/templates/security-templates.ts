import type { SecurityHeader } from "@apical-ts/core-utils/shared";

import { toValidVariableName } from "../utils.js";

/* Security code generation templates and rendering functions */

/**
 * Renders auth header validation code
 */
export function renderAuthHeaderValidation(authHeaders: string[]): string {
  if (authHeaders.length === 0) return "";

  const validationChecks = authHeaders.map((headerName) => {
    const varName = toValidVariableName(headerName);
    return `if (!${varName}) throw new Error('Missing required auth header: ${headerName}');`;
  });

  return validationChecks.join("\n  ");
}

/**
 * Renders security header handling code from security headers
 * - Global security: from config.securityHeaders
 * - Security override: from params.headers (required)
 */
export function renderSecurityHeaderHandling(
  operationSecurityHeaders: SecurityHeader[],
): string {
  if (operationSecurityHeaders.length === 0) return "";

  /* Deduplicate by computed variable name to prevent TS2451 from colliding names */
  const uniqueHeaders = new Map<string, SecurityHeader>();
  for (const header of operationSecurityHeaders) {
    const varName = toValidVariableName(header.headerName);
    const existing = uniqueHeaders.get(varName);
    if (!existing || (header.isRequired && !existing.isRequired)) {
      uniqueHeaders.set(varName, header);
    }
  }
  const deduplicatedHeaders = [...uniqueHeaders.values()];

  /* Helper to generate security header handling code */
  const generateHeaderCode = (header: SecurityHeader): string => {
    const varName = toValidVariableName(header.headerName);
    const source = header.isOverride ? "params.headers" : "config.headers";
    const useOptionalChaining = !(header.isOverride && header.isRequired);
    const optionalChain = useOptionalChaining ? "?." : "";
    const accessExpression = `${source}${optionalChain}['${header.headerName}']`;

    if (header.isRequired) {
      return `const _sec_${varName} = ${accessExpression};
    if (_sec_${varName} === undefined) throw new Error('Missing required security header: ${header.headerName}');
    finalHeaders['${header.headerName}'] = _sec_${varName};`;
    } else {
      return `const _sec_${varName} = ${accessExpression};
    if (_sec_${varName} !== undefined) finalHeaders['${header.headerName}'] = _sec_${varName};`;
    }
  };

  return deduplicatedHeaders.map(generateHeaderCode).join("\n    ");
}

/**
 * Renders security parameter extraction code
 * Always reads global security values from config.securityHeaders
 */
export function renderSecurityParameterExtraction(
  securityHeaders: SecurityHeader[],
): string {
  if (securityHeaders.length === 0) return "";

  const extractions = securityHeaders
    .filter((h) => !h.isOverride) // Only global security
    .map((header) => {
      const varName = toValidVariableName(header.headerName);
      return `const ${varName} = config.headers?.['${header.headerName}'];`;
    });

  return extractions.join("\n  ");
}
