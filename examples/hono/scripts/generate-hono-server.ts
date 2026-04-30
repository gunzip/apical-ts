import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateHonoServer } from "./hono-generator/generate-hono-server.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

await generateHonoServer(projectRoot);
