import path from "node:path";
import { parseArgs } from "node:util";

import { generateHonoServer } from "./hono-generator/generate-hono-server.js";

const { values } = parseArgs({
  options: {
    handlers: {
      type: "string",
    },
    "include-mocks": {
      type: "boolean",
    },
    output: {
      type: "string",
    },
    routes: {
      type: "string",
    },
  },
  strict: true,
});

const projectRoot = process.cwd();

await generateHonoServer({
  generatedHonoDirPath: path.resolve(
    projectRoot,
    values.output ?? "generated/hono",
  ),
  generatedRoutesDirPath: path.resolve(
    projectRoot,
    values.routes ?? "generated/routes",
  ),
  handlersDirPath: path.resolve(projectRoot, values.handlers ?? "handlers"),
  includeMocks: values["include-mocks"] ?? false,
  projectRoot,
});
