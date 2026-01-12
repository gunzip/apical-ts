/* Configuration file rendering templates - orchestrator */

import {
  renderApiResponseParsingUtilities,
  renderApiResponseTypes,
} from "./api-response-types.template.js";
import {
  renderAuthHeadersType,
  renderConfigImplementation,
  renderConfigInterface,
} from "./config-structure.template.js";
import { renderDeserializerTypes } from "./deserializer-types.template.js";
import {
  renderFormDataUtilities,
  renderFormUrlEncodeUtilities,
} from "./form-utilities.template.js";
import { renderOperationUtilities } from "./operation-utilities.template.js";
import { renderParameterSerializationUtilities } from "./parameter-serialization.template.js";
import {
  renderRequestBodyType,
  renderResponseParsingUtilities,
} from "./response-parsing.template.js";
import { renderZodImportStatement } from "./template-utils.js";

// Re-export all template functions to maintain API compatibility
export {
  renderApiResponseParsingUtilities,
  renderApiResponseTypes,
} from "./api-response-types.template.js";
export {
  renderAuthHeadersType,
  renderConfigImplementation,
  renderConfigInterface,
} from "./config-structure.template.js";
export { renderDeserializerTypes } from "./deserializer-types.template.js";
export {
  renderFormDataUtilities,
  renderFormUrlEncodeUtilities,
} from "./form-utilities.template.js";
export { renderOperationUtilities } from "./operation-utilities.template.js";
export { renderParameterSerializationUtilities } from "./parameter-serialization.template.js";
export {
  renderRequestBodyType,
  renderResponseParsingUtilities,
} from "./response-parsing.template.js";
export { renderZodImportStatement } from "./template-utils.js";

// Compatibility aliases for renamed functions
export { renderZodImportStatement as renderConfigImports };

/*
 * Renders the complete static support code
 */
export function renderConfigSupport(): string {
  return [
    renderApiResponseTypes(),
    "",
    renderRequestBodyType(),
    "",
    renderUtilityFunctions(),
    "",
    renderOperationUtilities(),
  ].join("\n");
}

/*
 * Renders utility functions for response handling
 */
export function renderUtilityFunctions(): string {
  return [
    renderFormDataUtilities(),
    "",
    renderResponseParsingUtilities(),
    "",
    renderDeserializerTypes(),
    "",
    renderApiResponseParsingUtilities(),
    "",
    renderFormUrlEncodeUtilities(),
    "",
    renderParameterSerializationUtilities(),
  ].join("\n");
}
