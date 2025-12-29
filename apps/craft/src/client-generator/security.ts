/* Re-export types for backward compatibility */
export type { SecurityHeader } from "../shared/models/security-models.js";

/* Re-export all security functions from shared */
export {
  analyzeGlobalSecuritySchemes,
  analyzeSecurityScheme,
  determineAuthHeaderRequirements,
  extractAuthHeaders,
  getOperationSecuritySchemes,
  hasSecurityOverride,
  processOperationSecurity,
} from "../shared/security-utils.js";
