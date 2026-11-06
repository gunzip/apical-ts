import "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    /** Base URL of the Prism mock server started in `global-setup.ts`. */
    mockServerUrl: string;
  }
}
