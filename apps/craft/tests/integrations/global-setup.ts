import type { TestProject } from "vitest/node";

import { getRandomPort, MockServer } from "./setup.js";

const SPEC_PATH = "tests/integrations/fixtures/test.yaml";

/**
 * Start a single Prism mock server for the whole run.
 *
 * Every integration test file used to spawn its own Prism instance against
 * the same spec, which meant a dozen concurrent processes fighting over
 * randomly chosen ports. One shared instance is started here and its base
 * URL is handed to the tests through `inject("mockServerUrl")`.
 */
export default async function setup(
  project: TestProject,
): Promise<() => Promise<void>> {
  const server = new MockServer({
    port: getRandomPort(),
    specPath: SPEC_PATH,
  });

  await server.start();
  project.provide("mockServerUrl", server.getBaseUrl());

  return async () => {
    await server.stop();
  };
}
