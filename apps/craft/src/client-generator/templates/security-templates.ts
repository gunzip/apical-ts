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
 * Renders security header handling code from security headers using bracket notation
 * Security headers are taken from config.headers (global auth), not params.headers
 */
export function renderSecurityHeaderHandling(
  operationSecurityHeaders: SecurityHeader[],
): string {
  if (operationSecurityHeaders.length === 0) return "";

  return operationSecurityHeaders
    .map((securityHeader) => {
      if (securityHeader.isRequired) {
        // Required headers must be present, throw error if missing
        return `const _sec_${toValidVariableName(securityHeader.headerName)} = config.headers['${securityHeader.headerName}'];
    if (_sec_${toValidVariableName(securityHeader.headerName)} === undefined) throw new Error('Missing required security header: ${securityHeader.headerName}');
    finalHeaders['${securityHeader.headerName}'] = _sec_${toValidVariableName(securityHeader.headerName)};`;
      } else {
        return `if (config.headers?.['${securityHeader.headerName}'] !== undefined) finalHeaders['${securityHeader.headerName}'] = config.headers['${securityHeader.headerName}'];`;
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
