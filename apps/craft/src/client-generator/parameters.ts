/* Re-export types for backward compatibility */
export type { ParameterGroups } from "../shared/models/parameter-models.js";

/* Re-export shared functions */
export {
  extractParameterGroups,
  resolveParameterReference,
} from "../shared/parameter-utils.js";
