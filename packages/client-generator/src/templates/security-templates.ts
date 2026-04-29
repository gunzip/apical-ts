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

  /* Deduplicate exact duplicate headers while preserving distinct header names. */
  const uniqueHeaders = new Map<string, SecurityHeader>();
  for (const header of operationSecurityHeaders) {
    const existing = uniqueHeaders.get(header.headerName);
    if (!existing || (header.isRequired && !existing.isRequired)) {
      uniqueHeaders.set(header.headerName, header);
    }
  }
  const deduplicatedHeaders = [...uniqueHeaders.values()];
  const usedVariableNames = new Set<string>();

  const getUniqueSecurityVariableName = (headerName: string): string => {
    const baseName = `_sec_${toValidVariableName(headerName)}`;
    let candidateName = baseName;
    let suffix = 2;

    while (usedVariableNames.has(candidateName)) {
      candidateName = `${baseName}_${suffix}`;
      suffix++;
    }

    usedVariableNames.add(candidateName);
    return candidateName;
  };

  /* Helper to generate security header handling code */
  const generateHeaderCode = (header: SecurityHeader): string => {
    const varName = getUniqueSecurityVariableName(header.headerName);
    const source = header.isOverride ? "params.headers" : "config.headers";
    const useOptionalChaining = !(header.isOverride && header.isRequired);
    const optionalChain = useOptionalChaining ? "?." : "";
    const accessExpression = `${source}${optionalChain}['${header.headerName}']`;

    if (header.isRequired) {
      return `const ${varName} = ${accessExpression};
    if (${varName} === undefined) throw new Error('Missing required security header: ${header.headerName}');
    finalHeaders['${header.headerName}'] = ${varName};`;
    } else {
      return `const ${varName} = ${accessExpression};
    if (${varName} !== undefined) finalHeaders['${header.headerName}'] = ${varName};`;
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
