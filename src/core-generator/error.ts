/**
 * Custom error class for API-related errors with additional context
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly responseBody: unknown,
    public readonly headers: Headers,
  ) {
    super(`API Error: ${statusCode}`);
    this.name = "ApiError";
  }
}
