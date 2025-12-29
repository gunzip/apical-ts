/* Re-export shared operation metadata types and functions */
export type { OperationMetadata } from "../shared/operation-extractor.js";
export { extractAllOperations } from "../shared/operation-extractor.js";

/* Re-export shared utility functions */
export {
  type ContentTypeMapping,
  extractRequestContentTypes,
  extractResponseContentTypes,
  extractServerUrls,
  type RequestContentTypes,
  resolveResponse,
  type ResponseContentTypes,
} from "../shared/operation-utils.js";
