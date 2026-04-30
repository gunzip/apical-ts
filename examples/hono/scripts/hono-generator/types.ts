export interface RouteDefinition {
  method: string;
  operationId?: string;
  params?: {
    shape?: Partial<Record<"headers" | "path" | "query", unknown>>;
  };
  path: string;
  requestMap: Record<string, unknown>;
  responseMap: Record<string, Record<string, unknown>>;
}

export interface BodyValidatorDefinition {
  contentType: string;
  target: "form" | "json";
}

export interface OperationDefinition {
  bodyValidators: BodyValidatorDefinition[];
  hasBody: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  honoPath: string;
  method: string;
  moduleBasename: string;
  operationId: string;
  paramNameMap: Record<string, string>;
  requestContentTypes: string[];
}
