import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

/**
 * Common utility to iterate through all operations in an OpenAPI document.
 * Works with all operations, regardless of whether they have operationId
 */
export function forEachOperation(
  openApiDoc: OpenAPIObject,
  callback: (
    operation: OperationObject,
    method: string,
    pathKey: string,
  ) => void,
): void {
  if (!openApiDoc.paths) {
    return;
  }

  for (const [pathKey, pathItem] of Object.entries(openApiDoc.paths)) {
    const pathItemObj = pathItem;

    // Define the HTTP methods we support with their corresponding operations
    const httpMethods: {
      method: string;
      operation: OperationObject | undefined;
    }[] = [
      { method: "get", operation: pathItemObj.get },
      { method: "post", operation: pathItemObj.post },
      { method: "put", operation: pathItemObj.put },
      { method: "delete", operation: pathItemObj.delete },
      { method: "patch", operation: pathItemObj.patch },
    ];

    for (const { method, operation } of httpMethods) {
      if (operation) {
        // OperationId is generated if missing
        callback(operation, method, pathKey);
      }
    }
  }
}
