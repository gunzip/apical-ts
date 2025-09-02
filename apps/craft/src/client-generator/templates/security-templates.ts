import type { SecurityHeader } from "../models/security-models.js";

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
 */
export function renderSecurityHeaderHandling(
  operationSecurityHeaders: SecurityHeader[],
): string {
  if (operationSecurityHeaders.length === 0) return "";

  return operationSecurityHeaders
    .map((securityHeader) => {
      const varName = toValidVariableName(securityHeader.headerName);
      if (securityHeader.isRequired) {
        return `finalHeaders['${securityHeader.headerName}'] = ${varName};`;
      } else {
        return `if (${varName} !== undefined) finalHeaders['${securityHeader.headerName}'] = ${varName};`;
      }
    })
    .join("\n    ");
}

/**
 * Renders security parameter extraction code
 */
export function renderSecurityParameterExtraction(
  securityHeaders: SecurityHeader[],
): string {
  if (securityHeaders.length === 0) return "";

  const extractions = securityHeaders.map((header) => {
    const varName = toValidVariableName(header.headerName);
    return `const ${varName} = config.headers?.['${header.headerName}'];`;
  });

  return extractions.join("\n  ");
}
