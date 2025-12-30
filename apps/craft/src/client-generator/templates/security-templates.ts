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
 * - Global security: from config.securityHeaders
 * - Security override: from params.headers (required)
 */
export function renderSecurityHeaderHandling(
  operationSecurityHeaders: SecurityHeader[],
): string {
  if (operationSecurityHeaders.length === 0) return "";

  return operationSecurityHeaders
    .map((securityHeader) => {
      const varName = toValidVariableName(securityHeader.headerName);

      if (securityHeader.isOverride) {
        // Security override: MUST be in params.headers (required)
        if (securityHeader.isRequired) {
          return `const _sec_${varName} = params.headers['${securityHeader.headerName}'];
    if (_sec_${varName} === undefined) throw new Error('Missing required security header: ${securityHeader.headerName}');
    finalHeaders['${securityHeader.headerName}'] = _sec_${varName};`;
        } else {
          return `const _sec_${varName} = params.headers?.['${securityHeader.headerName}'];
    if (_sec_${varName} !== undefined) finalHeaders['${securityHeader.headerName}'] = _sec_${varName};`;
        }
      } else {
        // Global security: from config.headers
        if (securityHeader.isRequired) {
          return `const _sec_${varName} = config.headers?.['${securityHeader.headerName}'];
    if (_sec_${varName} === undefined) throw new Error('Missing required security header: ${securityHeader.headerName}');
    finalHeaders['${securityHeader.headerName}'] = _sec_${varName};`;
        } else {
          return `const _sec_${varName} = config.headers?.['${securityHeader.headerName}'];
    if (_sec_${varName} !== undefined) finalHeaders['${securityHeader.headerName}'] = _sec_${varName};`;
        }
      }
    })
    .join("\n    ");
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
