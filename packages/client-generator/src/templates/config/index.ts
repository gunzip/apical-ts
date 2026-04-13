/* Configuration file rendering templates - orchestrator */

import {
  renderApiResponseParsingUtilities,
  renderApiResponseTypes,
} from "./api-response-types.template.js";
export { renderApiResponseTypes } from "./api-response-types.template.js";
export {
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
export { renderOperationUtilities } from "./operation-utilities.template.js";
import { renderParameterSerializationUtilities } from "./parameter-serialization.template.js";
import {
  renderRequestBodyType,
  renderResponseParsingUtilities,
} from "./response-parsing.template.js";

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
